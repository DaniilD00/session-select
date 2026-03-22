type BookingRecord = {
  booking_date: string;
  time_slot: string;
  adults: number;
  children: number;
  total_people?: number;
  total_price: number;
  payment_method: string;
  payment_status?: string;
  id: string;
  email: string;
  phone?: string;
  discount_code?: string | null;
};

export type EmailCustomizations = {
  customPriceText?: string;
  statusColor?: "orange" | "green" | "gray";
  customTotalPrice?: string;
  customAdults?: string;
  customChildren?: string;
  customTotalPeople?: string;
};

// Social icon images hosted on the sending domain to avoid spam filters
const INSTAGRAM_ICON_PATH = "social/instagram-rounded-medium.png";
const FACEBOOK_ICON_PATH = "social/facebook-rounded-medium.png";
const TIKTOK_ICON_PATH = "social/tiktok-rounded-medium.png";

const assetUrl = (base: string, path: string) => {
  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  return `${normalizedBase}/${normalizedPath}`;
};

const buildSocialIconsRow = (siteUrl: string) => `
  <div style="display:flex; justify-content:center; gap:12px; margin-top:32px;">
    <a href="https://instagram.com/readypixelgo_swe" style="display:block; text-decoration:none;" target="_blank" rel="noreferrer">
      <img src="${assetUrl(siteUrl, INSTAGRAM_ICON_PATH)}" alt="Instagram" width="48" height="48" style="display:block; border-radius:10px;" />
    </a>
    <a href="https://facebook.com/readypixelgo" style="display:block; text-decoration:none;" target="_blank" rel="noreferrer">
      <img src="${assetUrl(siteUrl, FACEBOOK_ICON_PATH)}" alt="Facebook" width="48" height="48" style="display:block; border-radius:10px;" />
    </a>
    <a href="https://www.tiktok.com/@readypixelgo" style="display:block; text-decoration:none;" target="_blank" rel="noreferrer">
      <img src="${assetUrl(siteUrl, TIKTOK_ICON_PATH)}" alt="TikTok" width="48" height="48" style="display:block; border-radius:10px;" />
    </a>
  </div>`;

export const buildBookingConfirmationHtml = (
  booking: BookingRecord,
  siteUrl: string,
  options?: EmailCustomizations
) => {
  const bookingDate = new Date(`${booking.booking_date}T00:00:00`);
  const dateLabel = bookingDate.toLocaleDateString("sv-SE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  
  const totalGuests = options?.customTotalPeople && options.customTotalPeople.trim() !== "" 
    ? options.customTotalPeople 
    : (booking.total_people ?? Number(booking.adults ?? 0) + Number(booking.children ?? 0));
    
  const adultsCount = options?.customAdults && options.customAdults.trim() !== ""
    ? options.customAdults
    : booking.adults;
    
  const childrenCount = options?.customChildren && options.customChildren.trim() !== ""
    ? options.customChildren
    : booking.children;

  const totalPrice = options?.customTotalPrice && options.customTotalPrice.trim() !== ""
    ? options.customTotalPrice
    : booking.total_price;

  const childrenLine = childrenCount ? ` + ${childrenCount} barn` : "";
  const phoneLine = booking.phone
    ? `<p style="margin:0; color:#cbd5f5;">Telefon: ${booking.phone}</p>`
    : "";
  const discountLine = booking.discount_code
    ? `<p style="margin:8px 0 0; color:#cbd5f5;">Rabattkod: <strong>${booking.discount_code}</strong></p>`
    : "";

  const colorMap = {
    orange: "#fbbf24",
    green: "#22c55e",
    gray: "#94a3b8",
  };
  const statusHex = options?.statusColor ? colorMap[options.statusColor] : "#94a3b8";
  const paymentContentText = options?.customPriceText || booking.payment_status || booking.payment_method;

  return `
      <!DOCTYPE html>
      <html lang="sv">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="color-scheme" content="dark light">
        <meta name="supported-color-schemes" content="dark light">
        <style>
          /* Hint to clients that this email is designed for dark as primary */
          :root { color-scheme: dark; }
          @media (prefers-color-scheme: dark) {
            body { background:#050816 !important; }
          }
        </style>
      </head>
      <body style="margin:0; padding:0; background:#050816; background-color:#050816 !important;">
        <div style="background:#050816; padding:24px 12px;">
          <div style="max-width:640px; margin:0 auto; background:linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border-radius:20px; padding:0; overflow:hidden; box-shadow:0 20px 60px rgba(0,0,0,0.5);">
            
            <!-- Header with gradient -->
            <div style="background:linear-gradient(135deg,#0ea5e9,#8b5cf6); padding:32px 32px; text-align:center; background-color:#0ea5e9;">
              <p style="letter-spacing:0.3em; text-transform:uppercase; color:#ffffff; font-size:13px; margin:0 0 12px; font-weight:600; opacity:0.95;">Ready Pixel Go</p>
              <h1 style="font-size:28px; margin:0; color:#ffffff; font-weight:700; line-height:1.3;">Din Bokning är Bekräftad! 🎉</h1>
            </div>
            
            <!-- Main content -->
            <div style="padding:32px; color:#e2e8f0; font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
              <p style="margin:0 0 24px; color:#cbd5e1; line-height:1.6; font-size:15px;">
                Tack för din bokning! Vi ser fram emot att välkomna dig till en fantastisk upplevelse på vårt LED-arkadgolv. 
                Här är en sammanfattning av din session - spara gärna mejlet! 📧
              </p>

              <!-- Date & Time Box with enhanced design -->
              <div style="margin:28px 0; padding:24px; border-radius:16px; background:linear-gradient(135deg,#22d3ee,#0ea5e9); background-color:#0ea5e9; text-align:center; box-shadow:0 8px 24px rgba(34,211,238,0.3);">
                <p style="margin:0 0 12px; text-transform:uppercase; font-size:11px; letter-spacing:0.25em; color:#0c4a6e; font-weight:700;">📅 Datum & Tid</p>
                <div style="background:rgba(255,255,255,0.95); border-radius:12px; padding:20px; margin:8px 0;">
                  <p style="margin:0; font-size:14px; line-height:1.5; color:#0f172a;">
                    När: <strong>${dateLabel}, ${booking.time_slot}</strong><br/>
                    Plats: <strong>Sundbybergsvägen 1F, 171 73 Solna</strong>
                  </p>
                </div>
              </div>

              <!-- Guest and Payment Info Cards -->
              <div style="display:flex; flex-wrap:wrap; gap:16px; margin:28px 0;">
                <div style="flex:1 1 250px; background:rgba(30,41,59,0.6); border:1px solid rgba(56,189,248,0.2); border-radius:16px; padding:20px;">
                  <p style="margin:0 0 12px; color:#22d3ee; text-transform:uppercase; font-size:11px; letter-spacing:0.2em; font-weight:700;">👥 Antal Gäster</p>
                  <p style="margin:0; font-size:28px; font-weight:700; color:#ffffff;">${totalGuests}</p>
                  <p style="margin:8px 0 0; color:#cbd5e1; font-size:14px;">${adultsCount} vuxna${childrenLine}</p>
                </div>
                <div style="flex:1 1 250px; background:rgba(30,41,59,0.6); border:1px solid rgba(56,189,248,0.2); border-radius:16px; padding:20px;">
                  <p style="margin:0 0 12px; color:#22d3ee; text-transform:uppercase; font-size:11px; letter-spacing:0.2em; font-weight:700;">💳 Betalning</p>
                  <p style="margin:0; font-size:28px; font-weight:700; color:#22d3ee;">${totalPrice} SEK</p>
                  <p style="margin:8px 0 0; color:#cbd5e1; font-size:14px;">Status: <strong style="color:${statusHex};">${paymentContentText}</strong></p>
                  ${discountLine ? `<p style="margin:6px 0 0; color:#fbbf24; font-size:13px; font-weight:600;">🎟️ ${discountLine.replace('<p style="margin:8px 0 0; color:#cbd5f5;">Rabattkod: <strong>', '').replace('</strong></p>', '')}</p>` : ''}
                </div>
              </div>

              <!-- Booking Details -->
              <div style="padding:20px 24px; border-radius:14px; background:rgba(30,41,59,0.6); border:1px solid rgba(148,163,184,0.2);">
                <p style="margin:0 0 16px; font-weight:700; color:#22d3ee; font-size:16px;">📋 Bokningsinformation</p>
                <div style="color:#cbd5e1; font-size:14px; line-height:1.8;">
                  <p style="margin:0 0 8px;"><strong style="color:#94a3b8;">Boknings-ID:</strong> <span style="font-family:'Courier New', monospace; color:#22d3ee;">${booking.id}</span></p>
                  <p style="margin:0 0 8px;"><strong style="color:#94a3b8;">E-post:</strong> ${booking.email}</p>
                  ${phoneLine ? `<p style="margin:0;"><strong style="color:#94a3b8;">Telefon:</strong> ${booking.phone}</p>` : ''}
                </div>
              </div>

              <!-- Before Your Visit Section -->
              <div style="margin-top:28px; padding:20px 24px; border-radius:14px; background:rgba(30,41,59,0.6); border:1px solid rgba(56,189,248,0.2);">
                <p style="margin:0 0 16px; font-weight:700; color:#22d3ee; font-size:16px; display:flex; align-items:center; gap:8px;">
                  ✨ Inför Ditt Besök
                </p>
                <ul style="margin:0; padding:0 0 0 20px; color:#cbd5e1; line-height:1.8; font-size:14px;">
                  <li style="margin-bottom:8px;">Anländ <strong style="color:#22d3ee;">15 minuter</strong> innan din bokade tid</li>
                  <li style="margin-bottom:8px;"><strong style="color:#fbbf24;">Ta med innerskor och bekväma kläder</strong> 👟</li>
                </ul>
                <div style="margin-top:16px; padding:16px; border-radius:8px; background:rgba(255,255,255,0.05); color:#cbd5e1; font-size:14px; line-height:1.6; border-left:4px solid #22d3ee;">
                  📍 <strong>Så hittar du hit:</strong><br/>
                  Det finns två ingångar till lokalen. Om ni reser med bil, kan ni åka till <strong>Sundbybergsvägen 1A</strong>, och om ni anländer med kollektivtrafik kan ni gå till till <strong>Sundbybergsvägen 1F</strong>.<br/><br/>
                  <em>Ring numret nedan när ni är utanför så kommer vår personal och öppnar dörren!</em>
                </div>
                <div style="margin-top:20px; padding:16px 20px; border-radius:12px; background:rgba(14,165,233,0.1); border:1px solid rgba(34,211,238,0.2); text-align:center;">
                  <p style="margin:0 0 12px; color:#cbd5e1; font-size:14px;">När ni är framme eller om ni vill ändra bokningen (48 timmar innan):</p>
                  <table style="margin:0 auto; border-collapse:collapse;">
                    <tr>
                      <td style="width:28px; text-align:center; padding:4px 0; font-size:14px;">📞</td>
                      <td style="padding:4px 0; font-size:14px; text-align:left;"><strong style="color:#22d3ee;">+46 76-614 77 30</strong></td>
                    </tr>
                    <tr>
                      <td style="width:28px; text-align:center; padding:4px 0; font-size:14px;">✉️</td>
                      <td style="padding:4px 0; font-size:14px; text-align:left;"><strong style="color:#22d3ee;">info@readypixelgo.se</strong></td>
                    </tr>
                  </table>
                </div>
              </div>

              <!-- Important reminder box -->
              <div style="margin-top:20px; padding:16px 20px; border-radius:12px; background:rgba(251,191,36,0.15); border-left:4px solid #fbbf24;">
                <p style="margin:0; color:#fbbf24; font-weight:700; font-size:14px;">
                  ⚠️ Viktigt: Ta med innerskor för bästa upplevelse!
                </p>
              </div>
              
              <!-- CTA Button -->
              <div style="text-align:center; margin:32px 0 28px;">
                <a href="${siteUrl}" style="display:inline-block; padding:16px 32px; border-radius:50px; background:#22d3ee; color:#0f172a; text-decoration:none; font-weight:700; font-size:16px; box-shadow:0 4px 14px rgba(34,211,238,0.4);">
                  🏠 Besök Vår Hemsida
                </a>
              </div>

              <!-- Social media section -->
              <div style="margin-top:32px; padding-top:28px; border-top:1px solid rgba(226,232,240,0.15); text-align:center;">
                <p style="margin:0 0 16px; color:#94a3b8; font-size:14px; font-weight:600;">Följ Oss På Sociala Medier</p>
                ${buildSocialIconsRow(siteUrl)}
              </div>

              <!-- Footer -->
              <div style="margin-top:28px; padding-top:24px; border-top:1px solid rgba(226,232,240,0.1); text-align:center;">
                <p style="margin:0 0 8px; font-size:14px; color:#94a3b8; line-height:1.6;">
                  Vi ser fram emot ditt besök! 🎮
                </p>
                <p style="margin:12px 0 0; font-size:11px; color:#64748b; line-height:1.5;">
                  Har du frågor? Ring <span style="color:#94a3b8;">+46 76-614 77 30</span> eller mejla <span style="color:#94a3b8;">info@readypixelgo.se</span>
                </p>
                <p style="margin:12px 0 0; font-size:11px; color:#475569; line-height:1.5;">
                  © 2026 Ready Pixel Go | <span style="color:#64748b;">Sundbybergsvägen 1F, 171 73 Solna</span>
                </p>
              </div>

            </div>
          </div>
        </div>
      </body>
      </html>
  `;
};

export const buildBookingConfirmationSubject = (booking: BookingRecord) => {
  const bookingDate = new Date(`${booking.booking_date}T00:00:00`);
  const dateLabel = bookingDate.toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
  return `Bokningsbekräftelse ${dateLabel} • Ready Pixel Go`;
};
