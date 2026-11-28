/* GrowthCore AI chat assistant
 * - Renders a floating chat widget with a local knowledge engine (works on any static host).
 * - If /api/chat is available (Vercel function with OPENAI_API_KEY), answers come from the LLM
 *   and the local engine is used as an offline fallback.
 */
(function () {
  'use strict';

  var root = document.getElementById('aiChat');
  if (!root) return;

  var launcher = document.getElementById('aiChatLauncher');
  var panel = document.getElementById('aiChatPanel');
  var closeBtn = document.getElementById('aiChatClose');
  var log = document.getElementById('aiChatLog');
  var form = document.getElementById('aiChatForm');
  var input = document.getElementById('aiChatInput');
  var suggest = document.getElementById('aiChatSuggest');
  var navBtn = document.getElementById('navAiChat');
  var sendBtn = form ? form.querySelector('button[type="submit"]') : null;

  var STORE_KEY = 'growthcore.chat.v1';
  var API_ENDPOINT = '/api/chat';
  var MAX_HISTORY = 24;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var history = [];
  var started = false;
  var busy = false;
  var activeTyping = null;
  var apiUsable = window.location.protocol === 'http:' || window.location.protocol === 'https:';
  var apiFailures = 0;

  /* ------------------------------------------------------------------ *
   * Knowledge base — answers about GrowthCore itself
   * ------------------------------------------------------------------ */

  var CHIPS = {
    audit: { label: 'What is the ₹1 audit?', send: 'What is the ₹1 audit?' },
    timeline: { label: 'How fast are results?', send: 'How long until I see results?' },
    content: { label: 'Do I write content?', send: 'Do I have to write my own content?' },
    price: { label: 'What does it cost?', send: 'What does it cost?' },
    start: { label: 'How do I start?', send: 'How do I get started?' },
    bookAudit: { label: 'Book the ₹1 audit', href: '#audit' },
    roadmap: { label: 'Get my roadmap', href: '#roadmap' },
    proof: { label: 'Show results', send: 'What results have you delivered?' }
  };

  var INTENTS = [
    {
      id: 'greet',
      keys: ['hi', 'hey', 'hello', 'yo', 'good morning', 'good evening', 'good afternoon', 'namaste', 'hii'],
      reply: function () {
        return "Hey! I'm GrowthCore's AI assistant. I can walk you through the ₹1 profile audit, how the growth system works, timelines, pricing, or point you to the right next step.\n\nWhat would you like to know?";
      },
      chips: ['audit', 'timeline', 'price']
    },
    {
      id: 'identity',
      keys: ['who are you', 'what are you', 'are you a bot', 'are you human', 'who is this', 'are you real'],
      reply: function () {
        return "I'm GrowthCore's AI assistant — a quick way to get answers about the profile audit, the content system and next steps without waiting for a reply.\n\nIf you want a person, drop your details in the roadmap form and the team picks it up.";
      },
      chips: ['audit', 'roadmap']
    },
    {
      id: 'audit',
      keys: ['audit', '₹1', '1 rupee', 're 1', 'one rupee', 'profile review', 'review my profile', 'check my profile', 'profile check', 'free review', 'no views', 'profile views'],
      reply: function () {
        return "The ₹1 Profile Audit is a hands-on review of your LinkedIn profile. Inside it you get:\n\n• A headline and About section rewrite\n• A bio audit — what's working, what reads like a resume\n• Content gap analysis — what your feed is missing\n• A clear brand direction\n• Action steps you can start the same day\n\nIt's ₹1 so you can judge the quality before committing to anything bigger. Book it from the Profile Audit section, or directly at payments.cashfree.com/forms/getaudit.";
      },
      chips: ['bookAudit', 'price', 'timeline']
    },
    {
      id: 'timeline',
      keys: ['how long', 'timeline', 'how fast', 'when will', 'results', 'how soon', 'weeks', 'months', 'time to see'],
      reply: function () {
        return "Realistic timeline:\n\n• Weeks 1-4 — profile rebuild plus a consistent posting rhythm. Profile views and engagement lift first.\n• Month 2 — the feed starts compounding; comments and DMs pick up.\n• Month 3+ — brand authority and inbound leads become steady rather than lucky.\n\nAnyone promising 10k followers in a week is selling noise. This is a system, so it looks slow for three weeks and then looks sudden.";
      },
      chips: ['proof', 'start', 'audit']
    },
    {
      id: 'content',
      keys: ['write my own', 'do i write', 'writing', 'who writes', 'content creation', 'post for me', 'posting', 'create content', 'draft', 'post on my profile', 'post on my account'],
      reply: function () {
        return "No — you don't write anything. Ideation, drafting, formats, publishing schedule and the comment pass are handled for you.\n\nYour only job is a weekly approval, roughly 15 minutes. You stay the face of the account; we do the typing.";
      },
      chips: ['time', 'start']
    },
    {
      id: 'time',
      keys: ['time commitment', 'how much time', 'hours', 'busy', 'commit', 'effort'],
      reply: function () {
        return "Plan for about 15-20 minutes a week. Most of that is reading the week's content and saying yes or asking for a tweak.\n\nEverything else — writing, scheduling, engaging on your behalf — runs without you.";
      },
      chips: ['content', 'start']
    },
    {
      id: 'price',
      keys: ['price', 'pricing', 'cost', 'charge', 'fees', 'fee', 'how much', 'budget', 'package', 'retainer', 'expensive', 'discount', 'per month'],
      reply: function () {
        return "Entry point is the ₹1 profile audit — that's a real audit, not a teaser call.\n\nBeyond that, retainers are scoped on the roadmap call based on your goals, posting cadence and whether you want profile-only work or full content plus lead generation. Nothing is charged before that conversation, and the roadmap itself is free.";
      },
      chips: ['audit', 'roadmap', 'start']
    },
    {
      id: 'services',
      keys: ['what do you do', 'services', 'how does it work', 'how it works', 'offer', 'help me with', 'growth system', 'strategy', 'leads', 'will this work', 'will it work', 'this will work', 'what is linkedin', 'one time', 'ongoing'],
      reply: function () {
        return "Three layers, in order:\n\n1. Profile optimization — headline, About, experience and featured section built to convert a visitor into a conversation.\n2. Content strategy — positioning pillars, formats and a posting rhythm you can actually sustain.\n3. Lead generation — turning attention into DMs, calls and clients.\n\nThe audit diagnoses what's broken. The roadmap sequences the fix.";
      },
      chips: ['audit', 'start', 'timeline']
    },
    {
      id: 'start',
      keys: ['get started', 'next step', 'sign up', 'signup', 'book', 'enquire', 'inquiry', 'contact', 'talk to', 'call me', 'call', 'reach out', 'apply'],
      reply: function () {
        return "Fastest path: fill the short form in the \"Your Roadmap\" section — name, email, phone — and you'll get a personalized plan back, usually within a business day.\n\nWant a read on your profile before that? The ₹1 audit is the cheapest way in.";
      },
      chips: ['roadmap', 'bookAudit']
    },
    {
      id: 'followers',
      keys: ['followers', 'followers count', 'engagement', 'virality', 'viral', 'likes', 'growth hacking'],
      reply: function () {
        return "We optimise for the right followers, not the biggest number. A smaller audience of decision-makers who reply and book calls beats 20,000 passive followers every time.\n\nFollower count grows as a by-product of useful, consistent posts — it's just not the metric we manage against.";
      },
      chips: ['proof', 'timeline']
    },
    {
      id: 'industry',
      keys: ['industry', 'industries', 'niche', 'b2b', 'saas', 'finance', 'real estate', 'consulting', 'student', 'fresher', 'job seeker', 'founder', 'works for'],
      reply: function () {
        return "LinkedIn works across industries — tech, SaaS, finance, consulting, real estate, design, healthcare and founder-led brands all run the same fundamentals.\n\nThe ₹1 audit includes a brand direction pass tuned to your niche, so nothing you get back is a generic template.";
      },
      chips: ['audit', 'start']
    },
    {
      id: 'proof',
      keys: ['case study', 'case studies', 'proof', 'testimonial', 'testimonials', 'results delivered', 'clients', 'examples', 'success story', 'reviews', 'delivered', 'show results', 'client results'],
      reply: function () {
        return "The track record so far: 100+ professionals helped, multiple profiles optimized, zero-to-one brand builds and 10k+ organic reach.\n\nTwo specifics from the reviews: Sarah (Product Manager) went from zero reach to recruiters in her DMs weekly, and Kevin (Consultant) saw engagement up 400% in two months.";
      },
      chips: ['timeline', 'audit']
    },
    {
      id: 'faq',
      keys: ['faq', 'guarantee', 'refund', 'contract', 'lock in', 'cancel', 'risk'],
      reply: function () {
        return "No long lock-ins and no charge before a scoped conversation — the ₹1 audit is the only paid commitment up front.\n\nOn outcomes: the team won't promise a follower number, because that's a vanity metric. The promise is the system — positioning, publishing cadence and a profile built to convert.";
      },
      chips: ['price', 'start']
    },
    {
      id: 'thanks',
      keys: ['thanks', 'thank you', 'thx', 'appreciate', 'helpful'],
      reply: function () {
        return "Anytime. If you want the fastest next step, the ₹1 audit is where most people start — it tells you exactly what's holding the profile back.";
      },
      chips: ['bookAudit', 'roadmap']
    },
    {
      id: 'bye',
      keys: ['bye', 'goodbye', 'see you', 'later', 'ok bye'],
      reply: function () {
        return "Cheers — the chat stays here if you think of something else. Good luck with the profile.";
      },
      chips: ['audit', 'roadmap']
    }
  ];

  var FALLBACK = {
    reply: function () {
      return "I don't have that one in my notes yet. I can cover the ₹1 audit, how the growth system works, timelines, content, pricing and next steps.\n\nFor anything specific to your situation, drop your details in the roadmap form and the team will answer directly.";
    },
    chips: ['audit', 'price', 'start', 'roadmap']
  };

  function normalise(text) {
    return ' ' + String(text).toLowerCase().replace(/[^\w₹\s]|_/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
  }

  /* Whole words only. Matching inside words made "hi" fire on "this" and "yo"
   * fire on "you", which stole the match from the question the visitor asked. */
  function scoreIntent(intent, message) {
    var score = 0;
    var longest = 0;
    for (var i = 0; i < intent.keys.length; i++) {
      var key = intent.keys[i];
      if (message.indexOf(' ' + key + ' ') !== -1) {
        // Longer phrases are more specific, so they win ties.
        score += key.split(' ').length + 0.5;
        if (key.length > longest) longest = key.length;
      }
    }
    return { score: score, longest: longest };
  }

  function localReply(text) {
    var message = normalise(text);
    var best = null;
    var bestScore = 0;
    var bestLongest = 0;
    var bestTopic = null;
    var topicScore = 0;
    var topicLongest = 0;

    for (var i = 0; i < INTENTS.length; i++) {
      var intent = INTENTS[i];
      var hit = scoreIntent(intent, message);

      if (hit.score > bestScore || (hit.score === bestScore && hit.score > 0 && hit.longest > bestLongest)) {
        bestScore = hit.score;
        bestLongest = hit.longest;
        best = intent;
      }

      if (intent.id !== 'greet' && (hit.score > topicScore || (hit.score === topicScore && hit.score > 0 && hit.longest > topicLongest))) {
        topicScore = hit.score;
        topicLongest = hit.longest;
        bestTopic = intent;
      }
    }

    // A greeting only answers a greeting: "hi, what does it cost?" is a price question.
    if (best && best.id === 'greet' && bestTopic && topicScore > 0) {
      best = bestTopic;
    }

    var picked = best || FALLBACK;
    return {
      text: picked.reply(),
      chips: picked.chips || []
    };
  }

  /* ------------------------------------------------------------------ *
   * Rendering helpers
   * ------------------------------------------------------------------ */

  function scrollToEnd() {
    log.scrollTop = log.scrollHeight;
  }

  function chipLabel(id) {
    return CHIPS[id] ? CHIPS[id].label : null;
  }

  function renderChips(ids) {
    suggest.innerHTML = '';
    if (!ids || !ids.length) return;

    ids.forEach(function (id) {
      var chip = CHIPS[id];
      if (!chip) return;

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ai-chip';
      btn.textContent = chip.label;

      if (chip.href) {
        btn.addEventListener('click', function () {
          var target = document.querySelector(chip.href);
          closeChat();
          if (target) {
            target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
            if (target.hasAttribute('tabindex') === false) target.setAttribute('tabindex', '-1');
            target.focus({ preventScroll: true });
          }
        });
      } else {
        btn.addEventListener('click', function () {
          send(chip.send);
        });
      }

      suggest.appendChild(btn);
    });

    // The chips take height from the log; without this the end of the answer hides.
    scrollToEnd();
  }

  function makeBubble(role, text) {
    var bubble = document.createElement('div');
    bubble.className = 'ai-msg ai-msg-' + role;
    bubble.textContent = text;
    log.appendChild(bubble);
    scrollToEnd();
    return bubble;
  }

  function finishTyping() {
    if (!activeTyping) return;
    var job = activeTyping;
    activeTyping = null;
    clearInterval(job.timer);
    job.el.textContent = job.text;
    log.setAttribute('aria-live', 'polite');
    scrollToEnd();
    if (job.done) job.done();
  }

  function typeOut(el, text, done) {
    // A new answer must never cut an older one off mid-sentence: finish it first.
    finishTyping();

    if (reduceMotion) {
      el.textContent = text;
      scrollToEnd();
      if (done) done();
      return;
    }

    var parts = text.split(/(\s+)/);
    var i = 0;
    el.textContent = '';

    // Duration-based, not per-token: a long answer reveals faster so it never crawls.
    var duration = Math.min(1100, Math.max(260, text.length * 4));
    var step = Math.max(8, Math.round(duration / parts.length));

    // Screen readers get the finished message once, not one letter at a time.
    log.setAttribute('aria-live', 'off');

    var job = { el: el, text: text, done: done, timer: null };
    activeTyping = job;
    job.timer = setInterval(function () {
      if (i >= parts.length) {
        clearInterval(job.timer);
        activeTyping = null;
        log.setAttribute('aria-live', 'polite');
        scrollToEnd();
        if (done) done();
        return;
      }
      el.textContent += parts[i++];
      scrollToEnd();
    }, step);
  }

  function showTyping() {
    var el = document.createElement('div');
    el.className = 'ai-typing';
    el.setAttribute('aria-label', 'Assistant is typing');
    el.innerHTML = '<i></i><i></i><i></i>';
    log.appendChild(el);
    scrollToEnd();
    return el;
  }

  function setBusy(state) {
    busy = state;
    if (sendBtn) sendBtn.disabled = state;
    input.setAttribute('aria-busy', state ? 'true' : 'false');
  }

  /* ------------------------------------------------------------------ *
   * Conversation flow
   * ------------------------------------------------------------------ */

  function remember(role, content) {
    history.push({ role: role, content: content });
    if (history.length > MAX_HISTORY) history = history.slice(-MAX_HISTORY);
    try {
      sessionStorage.setItem(STORE_KEY, JSON.stringify(history));
    } catch (err) {
      /* storage disabled — chat still works, just not persisted */
    }
  }

  function requestApi() {
    if (!apiUsable) return Promise.resolve(null);

    var controller = new AbortController();
    // The function allows the model 20s; aborting earlier killed answers that worked.
    var timeout = setTimeout(function () { controller.abort(); }, 25000);

    return fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: history
          .slice(-10)
          .map(function (m) { return { role: m.role, content: m.content }; })
      }),
      signal: controller.signal
    })
      .then(function (res) {
        // 503 means the backend has no key: stay local for the rest of the visit.
        if (res.status === 503) {
          apiUsable = false;
          throw new Error('not configured');
        }
        if (!res.ok) throw new Error('bad status ' + res.status);
        return res.json();
      })
      .then(function (data) {
        if (!data || typeof data.reply !== 'string' || !data.reply.trim()) throw new Error('empty reply');
        apiFailures = 0;
        return data.reply.trim();
      })
      .catch(function () {
        // No backend (static hosting) or it failed — stay on the local engine.
        // One slow answer must not disable the model for the whole visit.
        apiFailures += 1;
        if (apiFailures >= 2) apiUsable = false;
        return null;
      })
      .then(function (reply) {
        clearTimeout(timeout);
        return reply;
      });
  }

  function send(rawText) {
    var text = String(rawText || '').trim();
    if (!text || busy) return;

    openChat();
    setBusy(true);
    suggest.innerHTML = '';

    makeBubble('user', text);
    remember('user', text);
    input.value = '';
    autoGrow();

    var typing = showTyping();

    requestApi().then(function (apiReply) {
      if (apiReply) {
        typing.remove();
        var bubble = makeBubble('bot', '');
        setBusy(false);
        remember('assistant', apiReply);
        typeOut(bubble, apiReply, function () {
          renderChips(['audit', 'price', 'start']);
        });
        return;
      }

      var answer = localReply(text);
      // Small pause so the reply doesn't snap in instantly.
      setTimeout(function () {
        typing.remove();
        var el = makeBubble('bot', '');
        setBusy(false);
        remember('assistant', answer.text);
        typeOut(el, answer.text, function () {
          renderChips(answer.chips);
        });
      }, reduceMotion ? 0 : 420);
    });
  }

  /* ------------------------------------------------------------------ *
   * Open / close
   * ------------------------------------------------------------------ */

  function greet() {
    if (started) return;
    started = true;
    var intro = INTENTS[0];
    var el = makeBubble('bot', '');
    typeOut(el, intro.reply(), function () {
      renderChips(intro.chips);
    });
  }

  function openChat() {
    if (root.dataset.open === 'true') return;
    root.dataset.open = 'true';
    panel.hidden = false;
    launcher.setAttribute('aria-expanded', 'true');
    launcher.classList.add('is-open');
    greet();
    window.setTimeout(function () {
      if (window.matchMedia('(min-width: 760px)').matches) input.focus();
      scrollToEnd();
    }, 60);
  }

  function closeChat() {
    if (root.dataset.open !== 'true') return;
    root.dataset.open = 'false';
    panel.hidden = true;
    launcher.setAttribute('aria-expanded', 'false');
    launcher.classList.remove('is-open');
    launcher.focus({ preventScroll: true });
  }

  function toggleChat() {
    if (root.dataset.open === 'true') closeChat();
    else openChat();
  }

  /* ------------------------------------------------------------------ *
   * Input behaviour
   * ------------------------------------------------------------------ */

  function autoGrow() {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 96) + 'px';
  }

  launcher.addEventListener('click', toggleChat);
  closeBtn.addEventListener('click', closeChat);
  if (navBtn) {
    navBtn.addEventListener('click', function (event) {
      event.preventDefault();
      openChat();
    });
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    send(input.value);
  });

  input.addEventListener('input', autoGrow);
  input.addEventListener('keydown', function (event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      send(input.value);
    }
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && root.dataset.open === 'true') closeChat();
  });

  /* ------------------------------------------------------------------ *
   * Restore a session, if one exists
   * ------------------------------------------------------------------ */

  (function restore() {
    var saved = null;
    try {
      saved = JSON.parse(sessionStorage.getItem(STORE_KEY) || 'null');
    } catch (err) {
      saved = null;
    }
    if (!Array.isArray(saved) || !saved.length) return;

    history = saved.slice(-MAX_HISTORY);
    started = true;
    history.forEach(function (msg) {
      makeBubble(msg.role === 'user' ? 'user' : 'bot', msg.content);
    });
    renderChips(['audit', 'price', 'start', 'roadmap']);
  })();

  autoGrow();
})();
