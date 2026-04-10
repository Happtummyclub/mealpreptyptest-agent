const resultHtml = `
<div style="background-color:#f4f7f6;padding:40px 20px;font-family:Arial,Helvetica,sans-serif;">
  <table align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 18px rgba(0,0,0,0.06);">
    
    <!-- Header -->
    <tr>
      <td style="background-color:#6B8E23;color:#ffffff;text-align:center;padding:28px 24px;">
        <h1 style="margin:0;font-size:26px;line-height:1.2;">Happy Tummy Club</h1>
        <p style="margin:8px 0 0;font-size:14px;opacity:0.95;">Dein persönlicher Meal Prep Typ</p>
      </td>
    </tr>

    <!-- Content -->
    <tr>
      <td style="padding:32px 30px;color:#333333;line-height:1.7;">
        
        <p style="margin-top:0;">Hi ${parsed.vorname || "du"},</p>

        <p>
          Schön, dass du dir die Zeit für den Test genommen hast. 
          Ein erster Schritt für mehr Selbstfürsorge im Alltag. Sehr gut!
        </p>

        <!-- Profil-Grafik -->
        <h2 style="color:#6B8E23;font-size:20px;margin-top:28px;margin-bottom:16px;">
          Dein persönliches Meal Prep Profil
        </h2>

        <img
          src="${chartUrl}"
          alt="Dein persönliches Meal Prep Profil"
          style="display:block;width:100%;max-width:580px;height:auto;margin:0 auto 28px auto;border-radius:14px;"
        />

        <!-- Analyse -->
        <h2 style="color:#6B8E23;font-size:20px;margin-top:0;margin-bottom:16px;">
          Analyse deines Essensalltags
        </h2>

        <div style="
          background:#f8fbf9;
          border:1px solid #e4eee7;
          border-radius:12px;
          padding:22px 20px;
          color:#2f3a30;
          line-height:1.7;
        ">
          ${auswertungHtml}
        </div>

        <!-- Ableitung -->
        <h2 style="color:#6B8E23;font-size:20px;margin-top:32px;margin-bottom:14px;">
          Was bedeutet das für dich?
        </h2>

        <p>
          Deine Ergebnisse zeigen, welche Anforderungen eine passende Meal-Prep-Methode
          erfüllen sollte. Entscheidend ist ein Ansatz, der sich flexibel in deinen Alltag
          integrieren lässt und dich nachhaltig entlastet.
        </p>

        <p>
          Im nächsten Schritt schauen wir gemeinsam, wie du eine Struktur entwickeln kannst,
          die wirklich zu deinen Bedürfnissen passt – alltagstauglich, individuell und langfristig umsetzbar.
        </p>

        <!-- CTA -->
        <h2 style="color:#6B8E23;font-size:20px;margin-top:32px;margin-bottom:14px;">
          Dein nächster Schritt
        </h2>

        <div style="text-align:center;margin:32px 0 24px;">
          <a href="https://calendly.com/DEIN-LINK"
             target="_blank"
             style="
               background-color:#6B8E23;
               color:#ffffff;
               text-decoration:none;
               padding:14px 26px;
               border-radius:8px;
               font-weight:bold;
               display:inline-block;
             ">
            Startgespräch buchen
          </a>
        </div>

        <p style="margin-bottom:0;">Ich freue mich auf Dich!</p>

        <p style="margin-top:24px;margin-bottom:0;">
          Liebe Grüße<br>
          <strong>Samia vom Happy Tummy Club</strong>
        </p>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background:#f4f7f6;text-align:center;padding:16px;font-size:12px;color:#777;">
        © ${new Date().getFullYear()} Happy Tummy Club
      </td>
    </tr>

  </table>
</div>
`;
