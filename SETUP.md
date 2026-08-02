# الرفع على Netlify — 15 دقيقة

## اللي بيصير

- **الموقع** بيصير على Netlify — **مجاني**
- **الدومين** بيضل عند صاحبو بـ Combell — ما بينتقل
- بينهن **سطرين** بيوصلهن، هو بيحطهن بدقيقتين

---

## ١. GitHub (5 دقايق)

1. افتح مستودع جديد: **github.com/new**
   - الاسم: `simonscattery`
   - **Private** أو Public — التنين بيمشوا
   - ما تضيف README ولا .gitignore

2. من مجلد المشروع عندك:

```bash
git init
git add .
git commit -m "Simons Cattery"
git branch -M main
git remote add origin https://github.com/USERNAME/simonscattery.git
git push -u origin main
```

---

## ٢. Netlify (5 دقايق)

1. **app.netlify.com** → `Add new site` → `Import an existing project` → GitHub
2. اختار المستودع `simonscattery`
3. الإعدادات بتنقرا لحالها من `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `site`
4. اضغط **Deploy**

بعد دقيقة بيعطيك رابط متل `something-123.netlify.app` — افتحو، الموقع شغّال.

---

## ٣. تفعيل لوحة التحكم (3 دقايق)

بلوحة Netlify، على المشروع:

1. **Project configuration → Identity → Enable Identity**
2. تحت **Registration** اختار **Invite only**
3. تحت **Services → Git Gateway** اضغط **Enable Git Gateway**

بعدين:

4. تبويب **Identity → Invite users** → اكتب إيميل الزبونة → Send
5. بتوصلها رسالة → بتضغط الرابط → بتحط كلمة سرها
6. من هون وجاي بتفوت على `simonscattery.be/admin`

ادعي حالك كمان (إيميلك) عشان تجرّب.

---

## ٤. الدومين (دقيقتين — الجزء اللي بدو صاحب الدومين)

بلوحة Netlify:

**Domain management → Add a domain** → اكتب `simonscattery.be`

Netlify بتعطيك سطرين. عادةً هيك:

```
النوع    الاسم    القيمة
A        @        75.2.60.5
CNAME    www      اسم-موقعك.netlify.app
```

⚠️ **الأرقام اللي بتظهر عندك هي الصح — مو اللي مكتوب هون.**

خد صورة للشاشة وابعتها لصاحب الدومين على واتساب مع هالرسالة:

> Kan je in Combell bij DNS deze twee lijnen aanpassen?
> Het A-record van simonscattery.be → [الرقم]
> Het CNAME van www → [العنوان]
> De MX-records en mail-records **niet aanraken**.

بعد ساعة الموقع بيشتغل على `simonscattery.be`.
شهادة SSL بتنضاف لحالها.

---

## بعدين

كل تعديل بتعملو الزبونة باللوحة بينحفظ على GitHub، وNetlify بتعيد بناء الموقع لحالها خلال ~30 ثانية.

**ما في شي تعملو بعد هيك.**

---

## تجربة محلياً قبل الرفع

```bash
npm run serve
```
بيفتح على `localhost:8000`.
(لوحة التحكم ما بتشتغل محلياً — بدها Netlify.)
