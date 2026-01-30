/*!
 * floatdock.js（全部入り・設定込み1ファイル）
 * - HTML側は <script src=".../floatdock.js" defer></script> の1行だけ
 * - PC: フローティング
 * - スマホ: bottom-bar / floating / expand-fab（展開メニュー）を設定で選択
 * - スクロール時に隠れる（設定でON/OFF・条件調整可）
 * - 依存なし（バニラJS）
 */
(function () {
    "use strict";

    // =========================================================
    // 1) 設定（ここだけ編集してください）
    // =========================================================
    var CONFIG = {
        // 共通
        zIndex: 99999,
        breakpoint: 768, // px未満をスマホ扱い
        lineUrl: "https://line.me/R/ti/p/@162rtmeu?ts=10172301&oat_content=url",
        contactUrl: "https://monou.jp/contact",

        // どの表示方式を使うか（デバイス別）
        display: {
            desktop: "floating",   // "floating"（PCは基本これ）
            mobile: "bottom-bar"   // "bottom-bar" | "floating" | "expand-fab"
        },

        // スクロール時に隠す（全部のUIに共通で適用）
        hideOnScroll: {
            enabled: true,
            hideDirection: "down",     // "down"（下スクロールで隠す）| "up"
            hideAfter: 120,            // このpx以上スクロールしたら隠す判定を開始
            minDelta: 10,              // スクロール差分がこのpx未満なら無視（ガタつき防止）
            showAtTop: true,           // ページ最上部付近では必ず表示
            topThreshold: 40,          // 最上部判定のpx
            animationMs: 180           // 表示/非表示アニメーション時間
        },

        // PC フローティング設定
        desktopFloating: {
            enabled: true,
            position: "right-bottom", // "right-bottom" | "right-top" | "left-bottom" | "left-top"
            offsetX: 24,
            offsetY: 24,
            width: 260,
            height: 64,
            label: "公式LINE",
            subLabel: "らくに相談する",
            showIcon: true,
            url: "" // 空なら lineUrl を使用
        },

        // スマホ bottom-bar（下部固定）設定
        mobileBottomBar: {
            enabled: true,
            height: 64,
            safeArea: true,
            left:  { label: "お電話でのご予約", url: "tel:0120-000-0000", scheme: "auto", icon: "phone" },
            right: { label: "LINEでのご予約",   url: "",               scheme: "auto", icon: "line" } // 空なら lineUrl
        },

        // スマホ floating（丸/角丸）設定
        mobileFloating: {
            enabled: true,
            position: "right-bottom", // "right-bottom" | "left-bottom" | "right-top" | "left-top"
            offsetX: 16,
            offsetY: 16,
            size: 56,                 // 直径 or 高さ
            shape: "circle",          // "circle" | "rounded"
            bg: "#06C755",
            color: "#FFFFFF",
            icon: "line",
            label: null,              // nullでテキスト無し（アイコンのみ） / 文字列で表示
            url: ""                   // 空なら lineUrl
        },

        // スマホ expand-fab（展開メニュー）設定
        mobileExpandFab: {
            enabled: true,
            position: "right-bottom",
            offsetX: 16,
            offsetY: 16,
            size: 56,
            shape: "circle",
            mainBg: "#06C755",
            mainColor: "#FFFFFF",
            mainIcon: "menu",         // "menu" | "plus" など
            // 展開アイテム（上方向に縦展開）
            items: [
                { label: "お電話", icon: "phone", url: "tel:0120-000-0000", scheme: "auto", bg: "#E53935", color: "#FFFFFF" },
                { label: "LINE",   icon: "line",  url: "",               scheme: "auto", bg: "#06C755", color: "#FFFFFF" }, // 空なら lineUrl
                { label: "予約",   icon: "calendar", url: "/contact",    scheme: "auto", bg: "#1E88E5", color: "#FFFFFF" }
            ],
            closeOnOutsideTap: true,
            closeOnNavigate: true
        },

        // 見た目（共通）
        theme: {
            shadow: "0 10px 25px rgba(0,0,0,.18)",
            radius: 14,              // bottom-barの角丸など
            barRadiusTop: 18,
            fontFamily:
                "system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,'Noto Sans JP','Hiragino Kaku Gothic ProN','Yu Gothic',sans-serif"
        },

        debug: false
    };

    // =========================================================
    // 2) ユーティリティ
    // =========================================================
    function log() {
        if (!CONFIG.debug) return;
        try { console.log.apply(console, ["[LineWidget]"].concat([].slice.call(arguments))); } catch (e) {}
    }

    function isObject(x) { return x && typeof x === "object" && !Array.isArray(x); }

    function deepMerge(base, over) {
        var out = Array.isArray(base) ? base.slice() : Object.assign({}, base);
        if (!isObject(over)) return out;
        Object.keys(over).forEach(function (k) {
            var bv = base ? base[k] : undefined;
            var ov = over[k];
            if (isObject(bv) && isObject(ov)) out[k] = deepMerge(bv, ov);
            else out[k] = ov;
        });
        return out;
    }

    function clamp(n, min, max) {
        n = Number(n);
        if (!isFinite(n)) return min;
        return Math.min(max, Math.max(min, n));
    }

    function hasUrl(u) { return typeof u === "string" && u.trim() !== "" && u !== "#"; }

    function openByScheme(url, scheme) {
        if (!url) return;
        var s = scheme || "auto";

        if (s === "new-tab") { window.open(url, "_blank", "noopener,noreferrer"); return; }
        if (s === "same-tab") { window.location.href = url; return; }

        var isSpecial = /^tel:|^mailto:/i.test(url);
        if (isSpecial) { window.location.href = url; return; }

        try {
            var u = new URL(url, window.location.href);
            if (u.origin !== window.location.origin) window.open(u.href, "_blank", "noopener,noreferrer");
            else window.location.href = u.href;
        } catch (e) {
            window.location.href = url;
        }
    }

    function addStyle(cssText) {
        var style = document.createElement("style");
        style.setAttribute("data-line-widget", "true");
        style.textContent = cssText;
        document.head.appendChild(style);
    }

    function isMobileNow(cfg) {
        return window.innerWidth < (cfg.breakpoint || 768);
    }

    // ロゴ画像は使わず「汎用」SVG
    function svgIcon(name, color) {
        var stroke = color || "currentColor";
        var fill = color || "currentColor";
        var icons = {
            phone:
                '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
                '<path d="M6.5 3.5l3 2-1.2 2.4c-.2.4-.1.9.2 1.2l3.4 3.4c.3.3.8.4 1.2.2L15.5 12l2 3c.4.6.3 1.4-.2 1.9l-1.3 1.3c-.7.7-1.7 1-2.7.7-2.6-.7-5.2-2.5-7.5-4.8S2.7 9.2 2 6.6c-.3-1 .0-2 .7-2.7L4 2.6c.5-.5 1.3-.6 2-.1Z" stroke="' + stroke + '" stroke-width="2" stroke-linejoin="round"/>' +
                "</svg>",
            mail:
                '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
                '<path d="M4 6h16v12H4V6Z" stroke="' + stroke + '" stroke-width="2" />' +
                '<path d="m4 7 8 6 8-6" stroke="' + stroke + '" stroke-width="2" stroke-linejoin="round" />' +
                "</svg>",
            calendar:
                '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
                '<path d="M7 3v3M17 3v3" stroke="' + stroke + '" stroke-width="2" stroke-linecap="round"/>' +
                '<path d="M4 8h16v12H4V8Z" stroke="' + stroke + '" stroke-width="2"/>' +
                '<path d="M4 11h16" stroke="' + stroke + '" stroke-width="2"/>' +
                "</svg>",
            chat:
                '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
                '<path d="M20 11.8c0 3.7-3.6 6.7-8 6.7-1 0-2-.2-2.9-.5L4 19.4l1.3-3.1C4.5 15.2 4 13.6 4 11.8 4 8.1 7.6 5.1 12 5.1s8 3 8 6.7Z" stroke="' + stroke + '" stroke-width="2" stroke-linejoin="round"/>' +
                '<path d="M9 12h6" stroke="' + stroke + '" stroke-width="2" stroke-linecap="round"/>' +
                '<path d="M9 9.8h6" stroke="' + stroke + '" stroke-width="2" stroke-linecap="round"/>' +
                "</svg>",
            line:
                '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
                '<path d="M20 11.8c0 3.7-3.6 6.7-8 6.7-1 0-2-.2-2.9-.5L4 19.4l1.3-3.1C4.5 15.2 4 13.6 4 11.8 4 8.1 7.6 5.1 12 5.1s8 3 8 6.7Z" stroke="' + stroke + '" stroke-width="2" stroke-linejoin="round"/>' +
                '<path d="M9 12h6" stroke="' + stroke + '" stroke-width="2" stroke-linecap="round"/>' +
                '<path d="M9 9.8h6" stroke="' + stroke + '" stroke-width="2" stroke-linecap="round"/>' +
                "</svg>",
            menu:
                '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
                '<path d="M5 7h14M5 12h14M5 17h14" stroke="' + stroke + '" stroke-width="2" stroke-linecap="round"/>' +
                "</svg>",
            plus:
                '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
                '<path d="M12 5v14M5 12h14" stroke="' + stroke + '" stroke-width="2" stroke-linecap="round"/>' +
                "</svg>",
            close:
                '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
                '<path d="M6 6l12 12M18 6L6 18" stroke="' + stroke + '" stroke-width="2" stroke-linecap="round"/>' +
                "</svg>",
            chevronUp:
                '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
                '<path d="M6 14l6-6 6 6" stroke="' + stroke + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
                "</svg>",
            dot:
                '<svg viewBox="0 0 24 24" fill="' + fill + '" aria-hidden="true">' +
                '<circle cx="12" cy="12" r="6"/>' +
                "</svg>"
    };
        return icons[name] || icons.chat;
    }

    // =========================================================
    // 3) デフォルト（変更しない）
    // =========================================================
    var DEFAULTS = {
        zIndex: 99999,
        breakpoint: 768,
        lineUrl: "",
        contactUrl: "",
        display: { desktop: "floating", mobile: "bottom-bar" },
        hideOnScroll: {
            enabled: false,
            hideDirection: "down",
            hideAfter: 120,
            minDelta: 10,
            showAtTop: true,
            topThreshold: 40,
            animationMs: 180
        },
        desktopFloating: {
            enabled: true,
            position: "right-bottom",
            offsetX: 24,
            offsetY: 24,
            width: 260,
            height: 64,
            label: "公式LINE",
            subLabel: "",
            showIcon: true,
            url: ""
        },
        mobileBottomBar: {
            enabled: true,
            height: 64,
            safeArea: true,
            left:  { label: "問い合わせ", url: "", scheme: "auto", icon: "phone" },
            right: { label: "公式LINE",  url: "", scheme: "auto", icon: "line" }
        },
        mobileFloating: {
            enabled: true,
            position: "right-bottom",
            offsetX: 16,
            offsetY: 16,
            size: 56,
            shape: "circle",
            bg: "#06C755",
            color: "#FFFFFF",
            icon: "line",
            label: null,
            url: ""
        },
        mobileExpandFab: {
            enabled: true,
            position: "right-bottom",
            offsetX: 16,
            offsetY: 16,
            size: 56,
            shape: "circle",
            mainBg: "#06C755",
            mainColor: "#FFFFFF",
            mainIcon: "menu",
            items: [],
            closeOnOutsideTap: true,
            closeOnNavigate: true
        },
        theme: {
            shadow: "0 10px 25px rgba(0,0,0,.18)",
            radius: 14,
            barRadiusTop: 18,
            fontFamily:
                "system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,'Noto Sans JP','Hiragino Kaku Gothic ProN','Yu Gothic',sans-serif"
        },
        debug: false
    };

    var cfg = deepMerge(DEFAULTS, CONFIG);

    // 補完
    if (cfg.lineUrl) {
        if (!cfg.mobileBottomBar.right.url) cfg.mobileBottomBar.right.url = cfg.lineUrl;
        if (!cfg.mobileFloating.url) cfg.mobileFloating.url = cfg.lineUrl;
        cfg.mobileExpandFab.items = (cfg.mobileExpandFab.items || []).map(function (it) {
            if (it && !it.url && (it.icon === "line" || it.label === "LINE")) it.url = cfg.lineUrl;
            return it;
        });
    }
    if (cfg.contactUrl && !cfg.mobileBottomBar.left.url) cfg.mobileBottomBar.left.url = cfg.contactUrl;

    // =========================================================
    // 4) CSS 注入
    // =========================================================
    (function injectCss() {
        var barH = clamp(cfg.mobileBottomBar.height, 44, 88);
        var radius = clamp(cfg.theme.radius, 0, 30);
        var barRadiusTop = clamp(cfg.theme.barRadiusTop, 0, 30);
        var animMs = clamp(cfg.hideOnScroll.animationMs, 0, 600);

        addStyle([
            ":root{--lw-z:" + cfg.zIndex + ";}",
            ".lw-font{font-family:" + cfg.theme.fontFamily + ";}",

            // containers
            "#lw-root{position:fixed;z-index:var(--lw-z);pointer-events:none;}",
            "#lw-root *{box-sizing:border-box;}",

            // hide-on-scroll animation
            ".lw-anim{transition:transform " + animMs + "ms ease, opacity " + animMs + "ms ease;will-change:transform,opacity;}",
            ".lw-hidden{opacity:0;transform:translateY(14px);pointer-events:none !important;}",
            ".lw-hidden-up{opacity:0;transform:translateY(-14px);pointer-events:none !important;}",

            // Desktop floating
            ".lw-d-float{pointer-events:auto;display:flex;align-items:center;gap:12px;padding:10px 14px;" +
            "border-radius:" + radius + "px;box-shadow:" + cfg.theme.shadow + ";text-decoration:none;}",
            ".lw-d-float:hover{filter:brightness(.985);}",
            ".lw-d-float:active{transform:translateY(1px);}",
            ".lw-d-ico{width:34px;height:34px;flex:0 0 34px;border-radius:10px;background:rgba(255,255,255,.18);" +
            "display:flex;align-items:center;justify-content:center;}",
            ".lw-d-ico svg{display:block;width:18px;height:18px;}",
            ".lw-d-txt{display:flex;flex-direction:column;line-height:1.15;min-width:0;}",
            ".lw-d-lbl{font-size:16px;font-weight:800;letter-spacing:.2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}",
            ".lw-d-sub{font-size:12px;opacity:.92;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}",

            // Mobile bottom-bar
            ".lw-m-bar{pointer-events:auto;position:fixed;left:0;right:0;bottom:0;display:flex;width:100%;" +
            "z-index:var(--lw-z);overflow:hidden;border-top-left-radius:" + barRadiusTop + "px;border-top-right-radius:" + barRadiusTop + "px;" +
            "box-shadow:" + cfg.theme.shadow + ";}",
            ".lw-m-safe{padding-bottom:env(safe-area-inset-bottom);}",
            ".lw-m-btn{flex:1;display:flex;align-items:center;justify-content:center;gap:10px;" +
            "height:" + barH + "px;font-weight:800;font-size:14px;text-decoration:none;user-select:none;-webkit-tap-highlight-color:transparent;}",
            ".lw-m-btn:active{filter:brightness(.96);}",
            ".lw-m-ico{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;flex:0 0 22px;}",
            ".lw-m-ico svg{display:block;width:100%;height:100%;}",
            "body.lw-has-mbar{padding-bottom:" + (cfg.mobileBottomBar.safeArea ? "calc(" + barH + "px + env(safe-area-inset-bottom))" : barH + "px") + ";}",

            // Mobile floating button
            ".lw-mf{pointer-events:auto;display:flex;align-items:center;justify-content:center;gap:10px;" +
            "box-shadow:" + cfg.theme.shadow + ";text-decoration:none;user-select:none;-webkit-tap-highlight-color:transparent;}",
            ".lw-mf svg{display:block;width:22px;height:22px;}",
            ".lw-mf-label{font-weight:800;font-size:14px;white-space:nowrap;}",

            // Expand FAB
            ".lw-fab-wrap{pointer-events:none;position:fixed;z-index:var(--lw-z);}",
            ".lw-fab-wrap *{box-sizing:border-box;}",
            ".lw-fab-main{pointer-events:auto;display:flex;align-items:center;justify-content:center;" +
            "box-shadow:" + cfg.theme.shadow + ";user-select:none;-webkit-tap-highlight-color:transparent;}",
            ".lw-fab-main svg{display:block;width:22px;height:22px;}",
            ".lw-fab-items{pointer-events:none;display:flex;flex-direction:column;gap:10px;align-items:flex-end;}",
            ".lw-fab-item{pointer-events:auto;display:flex;align-items:center;gap:10px;text-decoration:none;box-shadow:" + cfg.theme.shadow + ";}",
            ".lw-fab-item svg{display:block;width:20px;height:20px;}",
            ".lw-fab-pill{padding:10px 12px;border-radius:999px;font-weight:800;font-size:13px;}",
            ".lw-fab-dot{width:44px;height:44px;display:flex;align-items:center;justify-content:center;border-radius:999px;}",
            ".lw-fab-closed .lw-fab-items{display:none;}",
            ".lw-fab-open .lw-fab-items{display:flex;pointer-events:auto;}",
            ".lw-fab-open{pointer-events:auto;}"
        ].join("\n"));
    })();

    // =========================================================
    // 5) DOM 構築・破棄
    // =========================================================
    var ROOT_ID = "lw-root";
    var root = null;

    var elDesktop = null;
    var elMobileBar = null;
    var elMobileFloat = null;
    var elFabWrap = null;

    function ensureRoot() {
        var exist = document.getElementById(ROOT_ID);
        if (exist) return exist;
        var r = document.createElement("div");
        r.id = ROOT_ID;
        document.body.appendChild(r);
        return r;
    }

    function clearAll() {
        if (root) root.innerHTML = "";
        elDesktop = null;

        if (elMobileBar && elMobileBar.parentNode) elMobileBar.parentNode.removeChild(elMobileBar);
        elMobileBar = null;
        document.body.classList.remove("lw-has-mbar");

        if (elMobileFloat && elMobileFloat.parentNode) elMobileFloat.parentNode.removeChild(elMobileFloat);
        elMobileFloat = null;

        if (elFabWrap && elFabWrap.parentNode) elFabWrap.parentNode.removeChild(elFabWrap);
        elFabWrap = null;

        detachOutsideHandlers();
    }

    function setFixedPosition(el, position, ox, oy) {
        el.style.top = "auto";
        el.style.right = "auto";
        el.style.bottom = "auto";
        el.style.left = "auto";

        var pos = position || "right-bottom";
        var x = Number.isFinite(ox) ? ox : 16;
        var y = Number.isFinite(oy) ? oy : 16;

        if (pos.indexOf("right") === 0) el.style.right = x + "px";
        else el.style.left = x + "px";

        if (pos.indexOf("bottom") > -1) el.style.bottom = y + "px";
        else el.style.top = y + "px";
    }

    // ---- Desktop floating ----
    function buildDesktopFloating() {
        var d = cfg.desktopFloating || {};
        if (!d.enabled || !cfg.desktopFloating.enabled) return;

        var url = d.url || cfg.lineUrl;
        if (!hasUrl(url)) return;

        var a = document.createElement("a");
        a.className = "lw-d-float lw-font lw-anim";
        a.href = url;
        a.style.background = "#06C755";
        a.style.color = "#FFFFFF";
        a.style.width = (d.width || 260) + "px";
        a.style.minHeight = (d.height || 64) + "px";
        a.setAttribute("role", "button");
        a.setAttribute("aria-label", (d.label || "公式LINE") + "を開く");
        a.addEventListener("click", function (e) {
            e.preventDefault();
            openByScheme(a.href, "auto");
        });

        if (d.showIcon) {
            var ico = document.createElement("div");
            ico.className = "lw-d-ico";
            ico.innerHTML = svgIcon("line", "rgba(255,255,255,.95)");
            a.appendChild(ico);
        }

        var txt = document.createElement("div");
        txt.className = "lw-d-txt";
        var lbl = document.createElement("div");
        lbl.className = "lw-d-lbl";
        lbl.textContent = d.label || "公式LINE";
        txt.appendChild(lbl);

        if ((d.subLabel || "").trim() !== "") {
            var sub = document.createElement("div");
            sub.className = "lw-d-sub";
            sub.textContent = d.subLabel;
            txt.appendChild(sub);
        }

        a.appendChild(txt);

        setFixedPosition(root, d.position, d.offsetX, d.offsetY);
        root.appendChild(a);
        elDesktop = a;
        trackForHideOnScroll(a, d.position);
    }

    // ---- Mobile bottom bar ----
    function buildMobileBottomBar() {
        var m = cfg.mobileBottomBar || {};
        if (!m.enabled) return;

        var leftUrl = (m.left && m.left.url) || cfg.contactUrl || "";
        var rightUrl = (m.right && m.right.url) || cfg.lineUrl || "";

        if (!hasUrl(leftUrl) && !hasUrl(rightUrl)) return;

        var bar = document.createElement("div");
        bar.className = "lw-m-bar lw-font lw-anim" + (m.safeArea ? " lw-m-safe" : "");
        bar.setAttribute("role", "navigation");
        bar.setAttribute("aria-label", "問い合わせ・LINEメニュー");

        function makeBtn(def, fallbackLabel, bg, color) {
            if (!def) return null;
            if (!hasUrl(def.url)) return null;

            var a = document.createElement("a");
            a.className = "lw-m-btn";
            a.href = def.url;
            a.style.background = bg;
            a.style.color = color;

            var ico = document.createElement("span");
            ico.className = "lw-m-ico";
            ico.innerHTML = svgIcon(def.icon || "chat", "currentColor");

            var label = document.createElement("span");
            label.textContent = def.label || fallbackLabel;

            a.appendChild(ico);
            a.appendChild(label);

            a.addEventListener("click", function (e) {
                e.preventDefault();
                openByScheme(a.href, def.scheme || "auto");
            });
            return a;
        }

        // 補完
        if (m.left) m.left.url = m.left.url || leftUrl;
        if (m.right) m.right.url = m.right.url || rightUrl;

        var leftBtn = makeBtn(m.left, "問い合わせ", "#E53935", "#FFFFFF");
        var rightBtn = makeBtn(m.right, "公式LINE", "#06C755", "#FFFFFF");

        if (leftBtn) bar.appendChild(leftBtn);
        if (rightBtn) bar.appendChild(rightBtn);

        if (!leftBtn && rightBtn) rightBtn.style.flex = "1";

        document.body.appendChild(bar);
        document.body.classList.add("lw-has-mbar");

        elMobileBar = bar;
        trackForHideOnScroll(bar, "bottom"); // bottom barは下方向に隠す
    }

    // ---- Mobile floating ----
    function buildMobileFloating() {
        var f = cfg.mobileFloating || {};
        if (!f.enabled) return;

        var url = f.url || cfg.lineUrl;
        if (!hasUrl(url)) return;

        var a = document.createElement("a");
        a.className = "lw-mf lw-font lw-anim";
        a.href = url;
        a.setAttribute("role", "button");
        a.setAttribute("aria-label", "公式LINEを開く");

        var size = clamp(f.size, 44, 88);
        a.style.height = size + "px";
        a.style.minWidth = size + "px";
        a.style.padding = "0 16px";
        a.style.background = f.bg || "#06C755";
        a.style.color = f.color || "#FFFFFF";

        var shape = (f.shape || "circle").toLowerCase();
        a.style.borderRadius = shape === "rounded" ? "16px" : "999px";

        // アイコン
        var ico = document.createElement("span");
        ico.style.display = "inline-flex";
        ico.style.alignItems = "center";
        ico.style.justifyContent = "center";
        ico.innerHTML = svgIcon(f.icon || "line", "currentColor");
        a.appendChild(ico);

        // ラベル（任意）
        if (typeof f.label === "string" && f.label.trim() !== "") {
            var t = document.createElement("span");
            t.className = "lw-mf-label";
            t.textContent = f.label;
            a.appendChild(t);
        } else {
            // アイコンのみの場合はpaddingを詰める
            a.style.padding = "0";
            a.style.width = size + "px";
        }

        a.addEventListener("click", function (e) {
            e.preventDefault();
            openByScheme(a.href, "auto");
        });

        // 直接 body に fixed で置く
        a.style.position = "fixed";
        a.style.zIndex = String(cfg.zIndex);
        setFixedPosition(a, f.position, f.offsetX, f.offsetY);

        document.body.appendChild(a);
        elMobileFloat = a;

        // position に応じて隠れる方向を調整
        trackForHideOnScroll(a, f.position);
    }

    // ---- Mobile expand-fab ----
    var outsideHandler = null;

    function detachOutsideHandlers() {
        if (outsideHandler) {
            document.removeEventListener("click", outsideHandler, true);
            outsideHandler = null;
        }
    }

    function buildMobileExpandFab() {
        var fab = cfg.mobileExpandFab || {};
        if (!fab.enabled) return;

        var size = clamp(fab.size, 44, 88);
        var shape = (fab.shape || "circle").toLowerCase();
        var radius = shape === "rounded" ? "16px" : "999px";

        var wrap = document.createElement("div");
        wrap.className = "lw-fab-wrap lw-font lw-anim lw-fab-closed";
        wrap.style.position = "fixed";
        wrap.style.zIndex = String(cfg.zIndex);
        setFixedPosition(wrap, fab.position, fab.offsetX, fab.offsetY);

        // items container
        var items = document.createElement("div");
        items.className = "lw-fab-items";
        items.style.marginBottom = "10px"; // mainボタンの上に並ぶ
        wrap.appendChild(items);

        // items build
        var list = Array.isArray(fab.items) ? fab.items.slice() : [];
        list = list.filter(Boolean).map(function (it) {
            // 補完
            if (!it.url && (it.icon === "line" || it.label === "LINE")) it.url = cfg.lineUrl;
            if (!it.url && (it.icon === "phone" || it.label === "お電話")) it.url = cfg.contactUrl;
            return it;
        });

        list.forEach(function (it) {
            if (!hasUrl(it.url)) return;

            var a = document.createElement("a");
            a.className = "lw-fab-item";
            a.href = it.url;
            a.setAttribute("role", "button");
            a.setAttribute("aria-label", it.label || "メニュー");

            // pill（ラベル）
            var pill = document.createElement("span");
            pill.className = "lw-fab-pill";
            pill.textContent = it.label || "";
            pill.style.background = "rgba(0,0,0,.72)";
            pill.style.color = "#FFFFFF";

            // dot（アイコン丸）
            var dot = document.createElement("span");
            dot.className = "lw-fab-dot";
            dot.style.background = it.bg || "#333";
            dot.style.color = it.color || "#FFF";
            dot.style.borderRadius = "999px";
            dot.innerHTML = svgIcon(it.icon || "chat", "currentColor");

            a.appendChild(pill);
            a.appendChild(dot);

            a.addEventListener("click", function (e) {
                e.preventDefault();
                openByScheme(a.href, it.scheme || "auto");
                if (fab.closeOnNavigate) setFabOpen(false);
            });

            items.appendChild(a);
        });

        // main button
        var main = document.createElement("button");
        main.type = "button";
        main.className = "lw-fab-main";
        main.setAttribute("aria-label", "メニューを開く/閉じる");
        main.style.width = size + "px";
        main.style.height = size + "px";
        main.style.border = "none";
        main.style.outline = "none";
        main.style.cursor = "pointer";
        main.style.borderRadius = radius;
        main.style.background = fab.mainBg || "#06C755";
        main.style.color = fab.mainColor || "#FFFFFF";

        main.innerHTML = svgIcon(fab.mainIcon || "menu", "currentColor");
        main.addEventListener("click", function () {
            setFabOpen(!isFabOpen());
        });

        wrap.appendChild(main);

        function isFabOpen() {
            return wrap.classList.contains("lw-fab-open");
        }
        function setFabOpen(open) {
            if (open) {
                wrap.classList.remove("lw-fab-closed");
                wrap.classList.add("lw-fab-open");
                // アイコンをcloseに切替
                main.innerHTML = svgIcon("close", "currentColor");
            } else {
                wrap.classList.remove("lw-fab-open");
                wrap.classList.add("lw-fab-closed");
                main.innerHTML = svgIcon(fab.mainIcon || "menu", "currentColor");
            }
        }

        // outside tap to close
        if (fab.closeOnOutsideTap) {
            outsideHandler = function (e) {
                if (!wrap) return;
                if (wrap.contains(e.target)) return;
                // open状態なら閉じる
                if (wrap.classList.contains("lw-fab-open")) {
                    e.stopPropagation();
                    setFabOpen(false);
                }
            };
            document.addEventListener("click", outsideHandler, true);
        }

        document.body.appendChild(wrap);
        elFabWrap = wrap;

        // 下側にあるので基本は下方向に隠す（位置で補正）
        trackForHideOnScroll(wrap, fab.position);
    }

    // =========================================================
    // 6) スクロール時に隠す
    // =========================================================
    var hideTargets = []; // {el, preferDirection}

    function trackForHideOnScroll(el, positionHint) {
        if (!cfg.hideOnScroll || !cfg.hideOnScroll.enabled) return;
        if (!el) return;

        // preferDirection:
        // - bottom系は translateY(+) で隠す
        // - top系は translateY(-) で隠す
        var prefer = "down";
        if (typeof positionHint === "string" && positionHint.indexOf("top") > -1) prefer = "up";
        // bottom-barは"bottom"を渡すのでdown
        hideTargets.push({ el: el, preferDirection: prefer });

        // 方向に応じてクラスを付与（上に隠す用）
        el.classList.add("lw-anim");
    }

    var lastY = 0;
    var ticking = false;

    function applyHideState(hidden, direction) {
        hideTargets.forEach(function (t) {
            if (!t.el) return;
            // elementごとの優先方向（上固定なら上へ隠す等）
            var dir = direction || t.preferDirection || "down";

            t.el.classList.remove("lw-hidden");
            t.el.classList.remove("lw-hidden-up");

            if (hidden) {
                if (dir === "up") t.el.classList.add("lw-hidden-up");
                else t.el.classList.add("lw-hidden");
            }
        });
    }

    function onScroll() {
        if (!cfg.hideOnScroll || !cfg.hideOnScroll.enabled) return;
        if (ticking) return;
        ticking = true;

        window.requestAnimationFrame(function () {
            ticking = false;

            var y = window.pageYOffset || document.documentElement.scrollTop || 0;
            var dy = y - lastY;
            lastY = y;

            var hs = cfg.hideOnScroll;
            var minDelta = clamp(hs.minDelta, 0, 200);
            if (Math.abs(dy) < minDelta) return;

            // 最上部付近では必ず表示
            if (hs.showAtTop && y <= clamp(hs.topThreshold, 0, 300)) {
                applyHideState(false);
                return;
            }

            // ある程度スクロールしてから有効化
            if (y < clamp(hs.hideAfter, 0, 2000)) {
                applyHideState(false);
                return;
            }

            // hideDirection に従って隠す
            var hideDir = (hs.hideDirection || "down").toLowerCase(); // "down" or "up"
            if (hideDir === "down") {
                // 下スクロールで隠す / 上スクロールで出す
                if (dy > 0) applyHideState(true, "down");
                else applyHideState(false);
            } else {
                // 上スクロールで隠す / 下スクロールで出す（特殊）
                if (dy < 0) applyHideState(true, "up");
                else applyHideState(false);
            }

            // 展開FABが開いている時にスクロールしたら閉じたい場合（UX安定）
            if (elFabWrap && elFabWrap.classList.contains("lw-fab-open")) {
                elFabWrap.classList.remove("lw-fab-open");
                elFabWrap.classList.add("lw-fab-closed");
                var btn = elFabWrap.querySelector(".lw-fab-main");
                if (btn) btn.innerHTML = svgIcon((cfg.mobileExpandFab && cfg.mobileExpandFab.mainIcon) || "menu", "currentColor");
            }
        });
    }

    // =========================================================
    // 7) マウント・更新（表示モード切替）
    // =========================================================
    var resizeTimer = null;

    function buildForCurrentMode() {
        root = ensureRoot();

        var mobile = isMobileNow(cfg);
        var mode = mobile ? (cfg.display && cfg.display.mobile) : (cfg.display && cfg.display.desktop);

        clearAll();        // 毎回作り直し（確実性優先）
        hideTargets = [];  // 追跡もリセット

        if (!mobile) {
            // Desktop
            if (mode === "floating") buildDesktopFloating();
            else buildDesktopFloating(); // desktopは基本floatingのみ運用想定
            return;
        }

        // Mobile
        switch ((mode || "bottom-bar").toLowerCase()) {
            case "floating":
                buildMobileFloating();
                break;
            case "expand-fab":
                buildMobileExpandFab();
                break;
            case "bottom-bar":
            default:
                buildMobileBottomBar();
                break;
        }
    }

    function mount() {
        if (!document.body) return;
        buildForCurrentMode();

        // hide-on-scroll
        if (cfg.hideOnScroll && cfg.hideOnScroll.enabled) {
            lastY = window.pageYOffset || document.documentElement.scrollTop || 0;
            window.removeEventListener("scroll", onScroll, { passive: true });
            window.addEventListener("scroll", onScroll, { passive: true });
        } else {
            window.removeEventListener("scroll", onScroll, { passive: true });
        }
    }

    function update() { mount(); }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", mount);
    } else {
        mount();
    }

    window.addEventListener("resize", function () {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(update, 120);
    });

    // 外部から更新できるように（任意）
    window.LineWidget = window.LineWidget || {};
    window.LineWidget.update = update;

})();
