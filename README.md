# 🚀 GrowthCore – LinkedIn Growth Strategy

### Turn Your LinkedIn From Invisible to Influential!

GrowthCore is a modern and visually engaging website designed to help professionals and job seekers grow their presence on LinkedIn. It showcases LinkedIn growth services, personal branding strategies, content creation, and profile optimization through an attractive user interface.

🌐 **Live Demo:** https://3-d-webinar-one.vercel.app/

---

## ✨ Features

- **Modern Landing Page:** Clean and attractive website design.
- **LinkedIn Growth Strategy:** Highlights strategies to build a strong LinkedIn presence.
- **Profile Audit:** Dedicated ₹1 LinkedIn profile audit section.
- **Lead Generation Form:** Allows visitors to submit their contact information.
- **Achievement Section:** Showcases growth statistics and achievements.
- **Client Testimonials:** Displays customer feedback and experiences.
- **FAQ Section:** Answers frequently asked questions.
- **AI Chat Assistant:** A floating chat widget that answers visitor questions about the audit, pricing, timelines and next steps — includes typing indicator, suggested-question chips, session memory and keyboard/screen-reader support.
- **Responsive Design:** Designed to provide a smooth browsing experience across devices.
- **Call-to-Action Sections:** Encourages visitors to explore services and get started.

---

## 🎯 Project Objective

The main objective of this project is to create a professional online platform that presents LinkedIn growth services in an engaging way.

It focuses on helping:
- Job seekers build a professional LinkedIn profile.
- Students improve their professional presence.
- Working professionals develop their personal brand.
- Entrepreneurs and founders increase their visibility.
- Businesses attract potential clients through LinkedIn.

---

## 🖥️ Website Preview

🔗 **Explore the Website:**  
https://3-d-webinar-one.vercel.app/

---

## 🛠️ Technologies Used

Add the technologies used in your project here:

- Frontend: [HTML, CSS and JavaScript]
- Styling: [Google stitch, figma design]
- Deployment: Vercel
- Version Control: Git & GitHub

---

## 🤖 AI Chat Assistant

The site ships a floating **Ask GrowthCore AI** chat widget (`chat.js`).

**How it answers**

- **Out of the box (static hosting):** a built-in intent engine answers questions about the
  ₹1 audit, pricing, timelines, content, results and next steps. No API key, no backend, no cost.
- **With an LLM (optional):** if `/api/chat` responds, answers come from the model instead.
  Any failure — missing key, timeout, error — silently falls back to the local engine, so the
  widget never breaks for a visitor.

**Enabling the LLM backend** (`api/chat.js`, a Vercel serverless function)

1. Import this repo into Vercel.
2. Add environment variables in **Project → Settings → Environment Variables**:

   | Variable | Required | Purpose |
   | --- | --- | --- |
   | `OPENAI_API_KEY` | yes | Server-side key. Never commit it. |
   | `OPENAI_BASE_URL` | no | Any OpenAI-compatible endpoint. Defaults to `https://api.openai.com/v1`. |
   | `CHAT_MODEL` | no | Defaults to `gpt-4o-mini`. |

3. Redeploy. Without `OPENAI_API_KEY` the endpoint returns `503` and the site keeps using
   the local engine.

**Note:** the endpoint is public and unauthenticated, so it spends your API credits. Input is
capped (12 messages, 1,500 chars each, 6,000 chars total), client-supplied `system` messages
are stripped, and the system prompt stays server-side. Add rate limiting before high traffic.

---

## 📌 Key Highlights

- Professional landing page design.
- Service-focused content presentation.
- User-friendly navigation and sections.
- Lead generation-oriented layout.
- Deployed and accessible online through Vercel.

---

## 👨‍💻 Author

**Developed with ❤️ by [Jeevan S]**

GitHub: [Your GitHub Profile](https://github.com/JeevanS-prog)

---

## ⭐ Support

If you find this project interesting, consider giving this repository a ⭐ on GitHub!

**Thanks for visiting GrowthCore!** 🚀
