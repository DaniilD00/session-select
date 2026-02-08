export type SocialLinks = {
  instagram: string;
  facebook: string;
  tiktok: string;
};

export const DEFAULT_SOCIAL_LINKS: SocialLinks = {
  instagram: "https://instagram.com/readypixelgo_swe",
  facebook: "https://facebook.com/readypixelgo",
  tiktok: "https://www.tiktok.com/@readypixelgo",
};

const INSTAGRAM_ICON_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAACwAAAAsCAYAAAAehFoBAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAABmJLR0QAAAAAAAD5Q7t/AAAEEUlEQVRYw+2Z729TVRjHP+cykhmgA9YON4Zz3VYz5AUJSkzIJGlli4oasmQmEiGDQHinLxDfbMRgFK3+AWbB8YLEX0Smy+aMXRaU8MIsSoxgKM1ASGGbreAEosPS44vTcnrvOntvO71b4jdpcs5zntP7ud+e89zTFv7XvythDaQ5ALAN2AJ0AJUucMWBE0DEIDwwK3CaA5XAMeBJFyBnUz/QaRC+bgLOOPvFPIPNagB4xiCMkRPcNk9hAbZm+EzAW9ymKqAnrMAdbhMVUIcV2I1q4EReK/CCUFnRMw0BzVWwYTWiLQBrVxWe891V5FcX4Mw1iCX/Q2D/SsTQbgh4nc1bX4PY/ahqj4whX/gAJm8588kx7J6NiLFXncNaFWxATHTDcw87mubMYf9KRE+7KST39cG3V2D898LzfUvgkVrEUV2QxGc7kKteh1/sOW0f2BBqGWQ1FEVu/xBu/GH/hidvQTSJPP4j4t2nYd9jCvrY88i29+1h2L5Yc5VpGcidHzuDBahairjzJuKHl5H7B3W8NQBrls8x8IbVun1oGBK3Z+aUGbDZD10hxJmXoCuk+mWZy5RnPtCGSrhzF7nruNkQG7K9JERbQLv7zaWZCU1exMheqK3Qc9bXqEZ8ChnsgVgSWXcY/kzBX3dhNK5zN9WpkjdnDufW2WuWDdbkRVx4xQRrUm2FGm/ywpXf9AZL5Gw0v70HbelPujJDOZtVKo1sPYKseQPZegRSae3iyF69PIpU6cCbHtTOptLIpd0QiakyF4mpfha6tkLluwrcUn+vKZ/qhemUeXw6peJ58l0BFu3rdOfsZP6knLgp3w1g+elZ3Wn25U/KiZvy3QDmlC5xom8HLF5kHl+8SMXz5LsDfPpniE+ptqcckTgIoUao9kCoUfU95Wo8PqXyS1Dx5+GsUmlksEfVWYCKcsTwnrypMthjKnPFyL7D31/V7boV5rFYEhl4RzttVXxKjVsP7dUefTPnJmxh2HZYRmKIXerwLYINyC+jM6Hr31J1tqUe0b5ObbBTl9QyyOfsxjW6ffqyLY7cH1LkP2Y+5EOc369voO6weswWqxX3Ia6/pt/PxpnYICzsL4loAr6+qO90sBMeWF4crG8J4qPtut87avsAb99hgPuXIca7zLG3TyJPXoTLNwpfrcaD2OyH7pApLD0H4eZ0wekGYeEMGODZtYjPdxZha37Jx9+zXZudLYms+n9C+g7B4PnSSHtHlbMOHyTF1eHkbeTWo1C9TH1TaKlHNBb+Fi3PTahqEE3YXrNzA5zV+E31GhnD3noqXQvup6pc4F/dhimguBX4E7eJCuiEFTjiNlEBRazAfcCQ21SzqD/7b9I9YIMwwIvzEHoA6Mx25uv/dEnUnhoG+jJmLkz9DbMDPggvgL8KAAAAJXRFWHRkYXRlOmNyZWF0ZQAyMDIxLTA2LTA4VDE1OjAyOjM5KzAwOjAwarlWBgAAACV0RVh0ZGF0ZTptb2RpZnkAMjAyMS0wNi0wOFQxNTowMjozOSswMDowMBvk7roAAAAASUVORK5CYII=";
const FACEBOOK_ICON_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAACwAAAAsCAYAAAAehFoBAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAABmJLR0QAAAAAAAD5Q7t/AAAByklEQVRYw+3ZPUgCYRzH8W8vKhRIr/RCQzQFBdEkNEVZEZUghFuDU02OQlN7UdDo0lJTRIJJQYZb0FxDS7hUWym51NnrkIqeXofco89J99vuuef+fO7heR7ueMBKddOgbphajQB4gRnAB3RKcD0Ax0AsHvJENcFTq5FOYB+Yl4DUSgTwx0OeZBE4O7KnJsPmEgWW4iEPjQWNXpNiARazviLwjGyVTtxqsE+2SCc+NVjGblBJutTgukiz6IIOWxN93S0MD7bhGu2hv7ul6H5g6xIl82kOsLPVzt7GJO1Oh2afhgrqVRVstzUS3p4T+f5lI2wOjwx1VB0rFDwx1lsTsLAp4Wy1lW0P7l6ReEznr98MLDihYK0kHtOk0oqwev9rH253OjjanP2zj/r+QuDU0LSo+Qhn3r8MPV9T8Kvywdf3d/2Ab+6ShmvUFHybSBmuYWjRpdIK02snAKz7x3G7Bkr6LAfP//e2ZoEtsAW2wBbYAlcUYX8cyvsnd/cvJe0GP86qB945uBYr00jdTYlC8LNsjE4e1OBD2SKdHKvBMdkincTU4DBwJlulkUjuNCkPjoc8ACsmREcBf+7CrOd0T/yuqQsgnB3M+swPwu5peHuIHKQAAAAldEVYdGRhdGU6Y3JlYXRlADIwMjEtMDYtMTBUMDI6MjI6MTErMDA6MDBX1hX/AAAAJXRFWHRkYXRlOm1vZGlmeQAyMDIxLTA2LTEwVDAyOjIyOjExKzAwOjAwJoutQwAAAABJRU5ErkJggg==";
const TIKTOK_ICON_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAACwAAAAsCAYAAAAehFoBAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAABmJLR0QAAAAAAAD5Q7t/AAACmUlEQVRYw+2Zu2siURTGv0l8DIKgu4iFwfhoFHz0IinEacw2EexSBAs7/wALhfwDgRV21U4bixUWYmCbtbWwsBJLsVgRMTuQIkRE5G6zgo9R5+XMBPLBaY5nzvy8892ZO3OBD6mjGwDfAfwFQFSIPwC+AvhyDPQzgF8qQe6LRwCf9gFrDXYVT/tsoDbYobgBgLM1YOaYX1RWfDuh1gTjG88AQK0BE7WHkIeoM+k9lJXuVI09Hg/u7+83co1GA81mU5vARqMRt7e3G7lutyvrOWSdJH6/n2xrNBpJ7QtFPexwOBCJRCT1UHzStdttBAKB9wMMAL1eD/l8Hl6vF2azWXSfk3t4n+x2uzY9LIdkBaZpGgaDQdvA19fXKJVKYFkWs9kM8/kcJpOJs7ZQKKDX60k6n+gHh9VqRaVSQSqVEnRcKBSC2+3G1dUVGIaBy+UCIfyXMaKAbTYbptOp6FEaDocYDoeo1WqCjxVliWq1KhpWqgQDJ5NJJBIJzt9arRZeX1+1BZzJZHZyDw8P0Ov1YBgGZrMZb29vJ4Ve6eiNm6Iozhu/Xq/n9eDI5/PKLn4sFstOrl6vY7FYKDKigoFns9lOzul0ctZeXl7u5Pr9vqzwvC4Ly7I7lzoYDG7UGI1Gslwud+q8Xq9kSwgGLpfLnD6+u7sjPp+PxONxMh6POWtomlYe2Ol08l6FrSubzcqxChQODICk02lBsIPBgJyfn6sHTFEUKRaLvGAnk4kc3pUGvIpoNHoQNpfLEZ1OJ+eLgfQvPzRN4+LiAuFwGLFYDP1+H51OB4PBAC8vL2JaHhL18anq1FoHZtWGOaLRNvAPtYmO6Oc28G+1iY6Ik0+rexyP+/6FFneRnnBgF2kltffpngF8+8/xvvUPsMULwTcmeXoAAAAldEVYdGRhdGU6Y3JlYXRlADIwMjEtMDYtMDlUMjE6MzA6MDIrMDA6MDBplm3/AAAAJXRFWHRkYXRlOm1vZGlmeQAyMDIxLTA2LTA5VDIxOjMwOjAyKzAwOjAwGMvVQwAAAABJRU5ErkJggg==";

export type WaitlistEmailParams = {
  firstName?: string;
  percent: number;
  code: string;
  expiryISO: string;
  limit: number;
  unsubscribeUrl: string;
  siteUrl: string;
  socialLinks?: SocialLinks;
};

const assetUrl = (base: string, path: string) => {
  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  return `${normalizedBase}/${normalizedPath}`;
};

export const buildSocialIconsRow = (
  siteUrl: string,
  links: SocialLinks = DEFAULT_SOCIAL_LINKS
) => `
  <div style="display:flex; justify-content:center; gap:12px; margin-top:12px;">
    <a href="${links.instagram}" style="display:block; text-decoration:none;" target="_blank" rel="noreferrer">
      <img src="data:image/png;base64,${INSTAGRAM_ICON_BASE64}" alt="Instagram" width="48" height="48" style="display:block; border-radius:10px;" />
    </a>
    <a href="${links.facebook}" style="display:block; text-decoration:none;" target="_blank" rel="noreferrer">
      <img src="data:image/png;base64,${FACEBOOK_ICON_BASE64}" alt="Facebook" width="48" height="48" style="display:block; border-radius:10px;" />
    </a>
    <a href="${links.tiktok}" style="display:block; text-decoration:none;" target="_blank" rel="noreferrer">
      <img src="data:image/png;base64,${TIKTOK_ICON_BASE64}" alt="TikTok" width="48" height="48" style="display:block; border-radius:10px;" />
    </a>
  </div>`;

export const buildWaitlistEmailHtml = ({
  firstName,
  percent,
  code,
  expiryISO,
  limit,
  unsubscribeUrl,
  siteUrl,
  socialLinks,
}: WaitlistEmailParams) => {
  const expiryDate = new Date(expiryISO);
  const friendlyName = firstName ? firstName.trim() : "vän";
  const expiryLabel = expiryDate.toLocaleDateString("sv-SE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return `
    <!DOCTYPE html>
    <html lang="sv">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="color-scheme" content="dark light">
      <meta name="supported-color-schemes" content="dark light">
      <style>
        :root { color-scheme: dark; }
        @media (prefers-color-scheme: dark) {
          body { background:#050816 !important; }
        }
      </style>
    </head>
    <body style="margin:0; padding:0; background:#050816; background-color:#050816 !important;">
      <div style="background:#050816; padding:24px 12px;">
        <div style="max-width:600px; margin:0 auto; background:linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border-radius:20px; padding:0; overflow:hidden; box-shadow:0 20px 60px rgba(0,0,0,0.5);">
          
          <!-- Header with gradient -->
          <div style="background:linear-gradient(135deg,#0ea5e9,#8b5cf6); background-color:#0ea5e9; padding:32px 28px; text-align:center;">
            <p style="letter-spacing:0.3em; text-transform:uppercase; color:#ffffff; font-size:13px; margin:0 0 12px; font-weight:600; opacity:0.95;">Ready Pixel Go</p>
            <h1 style="font-size:28px; margin:0; color:#ffffff; font-weight:700; line-height:1.3;">Din Lanseringsrabatt! 🎉</h1>
          </div>
          
          <!-- Main content -->
          <div style="padding:32px 28px; color:#e2e8f0; font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <p style="font-size:18px; margin:0 0 8px; color:#ffffff;">Hej ${friendlyName}!</p>
            <p style="margin:0 0 24px; color:#cbd5e1; line-height:1.6; font-size:15px;">
              Grattis! Du står nu på VIP-listan och har säkrat din rabattkod för <strong style="color:#22d3ee;">${percent}% rabatt</strong> när vi öppnar för bokning. 
              Erbjudandet gäller för de första <strong>${limit} bokningarna</strong> ⚡
            </p>
            
            <!-- Code box with enhanced design -->
            <div style="margin:28px 0; padding:24px; border-radius:16px; background:linear-gradient(135deg,#22d3ee,#0ea5e9); background-color:#0ea5e9; text-align:center; box-shadow:0 8px 24px rgba(34,211,238,0.3);">
              <p style="margin:0 0 8px; text-transform:uppercase; font-size:11px; letter-spacing:0.25em; color:#0c4a6e; font-weight:700;">Din Rabattkod</p>
              <div style="background:rgba(255,255,255,0.95); border-radius:12px; padding:16px; margin:12px 0;">
                <p style="font-size:16px; font-weight:800; letter-spacing:0.1em; margin:0; color:#0f172a; font-family:'Courier New', monospace;">${code}</p>
              </div>
              <p style="margin:8px 0 0; color:#0c4a6e; font-size:13px; font-weight:600;">
                ✨ Giltig till ${expiryLabel}
              </p>
            </div>
            
            <!-- CTA Button -->
            <div style="text-align:center; margin:28px 0;">
              <a href="${siteUrl}" style="display:inline-block; padding:16px 32px; border-radius:50px; background:#22d3ee; color:#0f172a; text-decoration:none; font-weight:700; font-size:14px; box-shadow:0 4px 14px rgba(34,211,238,0.4); transition:all 0.3s;">
                🎮 Boka Så Snart Vi Öppnar
              </a>
            </div>
            
            <!-- What happens next section -->
            <div style="margin-top:32px; padding:20px; border-radius:14px; background:rgba(30,41,59,0.6); border:1px solid rgba(56,189,248,0.2);">
              <p style="margin:0 0 16px; font-weight:700; color:#22d3ee; font-size:16px; display:flex; align-items:center; gap:8px;">
                💡 Vad Händer Nu?
              </p>
              <ul style="margin:0; padding:0 0 0 20px; color:#cbd5e1; line-height:1.8; font-size:14px;">
                <li style="margin-bottom:8px;">Vi mejlar dig direkt när bokningen öppnar 📧</li>
                <li style="margin-bottom:8px;">Aktivera <strong style="color:#22d3ee;">${percent}% rabatt</strong> genom att ange koden vid checkout 💰</li>
                <li style="margin-bottom:8px;">Ta med upp till sex vänner och upplev vårt LED-arkadgolv 🕹️</li>
                <li style="margin-bottom:8px;"><strong style="color:#fbbf24;">Ta med innerskor och sportkläder</strong> 👟</li>
              </ul>
            </div>
            
            <!-- Important reminder box -->
            <div style="margin-top:20px; padding:16px 20px; border-radius:12px; background:rgba(251,191,36,0.15); border-left:4px solid #fbbf24;">
              <p style="margin:0; color:#fbbf24; font-weight:700; font-size:14px; display:flex; align-items:center; gap:8px;">
                ⚠️ Viktigt att komma ihåg
              </p>
              <p style="margin:8px 0 0; color:#fde68a; font-size:13px; line-height:1.6;">
                Kom ihåg att ta med <strong>innerskor</strong> och bekväma <strong>sportkläder</strong> för bästa upplevelse på LED-golvet!
              </p>
            </div>
            
            <!-- Social media section -->
            <div style="margin-top:32px; padding-top:24px; border-top:1px solid rgba(226,232,240,0.15); text-align:center;">
              <p style="margin:0 0 16px; color:#94a3b8; font-size:14px; font-weight:600;">Följ Oss På Sociala Medier</p>
              ${buildSocialIconsRow(siteUrl, socialLinks ?? DEFAULT_SOCIAL_LINKS)}
            </div>
            
            <!-- Footer -->
            <div style="margin-top:28px; padding-top:20px; border-top:1px solid rgba(226,232,240,0.1); text-align:center;">
              <p style="margin:0 0 12px; font-size:12px; color:#64748b;">
                Vill du inte få fler mejl? Inga problem.
              </p>
              <a href="${unsubscribeUrl}" style="display:inline-block; padding:8px 20px; border-radius:50px; border:1px solid #64748b; color:#94a3b8; text-decoration:none; font-size:12px; transition:all 0.3s;">
                Avregistrera mig
              </a>
              <p style="margin:16px 0 0; font-size:11px; color:#475569; line-height:1.5;">
                © 2026 Ready Pixel Go | Sundbybergsvägen 1F, 171 73 Solna
              </p>
            </div>
            
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const buildWaitlistEmailSubject = (percent: number) => `Din ${percent}% lanseringskod`;
