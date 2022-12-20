(() => {

const kModPath = "/instance/";

window.addEventListener("DOMContentLoaded", () => {
  const mods = [
    mod_style,
    mod_highlight,
    mod_math,
  ];

  // call init()
  for (const mod of mods) {
    if (mod.init) mod.init();
  }

  // create observer
  const obs = new MutationObserver(async (muts, obs) => {
    for (const mut of muts) {
      for (const e of mut.addedNodes) {
        if (!e || !e.querySelectorAll) continue;

        // call alter()
        for (const st of Array.from(e.querySelectorAll(".Conversation .Status:not(.mod-altered)"))) {
          for (const mod of mods) {
            if (mod.alter) await mod.alter(st);
          }
          st.classList.add("mod-altered");
        }
      }
    }
  });

  // start observation
  function init() {
    const main = document.querySelector(".main");
    if (main) {
      main.querySelectorAll(".Conversation .Status").forEach(async (st) => {
        for (const mod of mods) {
          if (mod.alter) await mod.alter(st);
        }
        st.classList.add("mod-altered");
      });
      obs.observe(main, {subtree: true, childList: true});
    } else {
      setTimeout(init, 1000);
    }
  }
  init();
});

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
function importExternalScript(url) {
  const e = document.createElement("script");
  e.src = url;
  document.head.appendChild(e);
}
function importExternalStyle(url) {
  const e = document.createElement("link");
  e.rel  = "stylesheet";
  e.type = "text/css";
  e.href = url;
  document.head.appendChild(e);
}


// loads additional CSS
const mod_style = {
  init: async () => {
    importExternalStyle(kModPath+"custom.css");
  },
};


// enables syntax highlight
const mod_highlight = {
  initialized: false,
  init_lazy: async () => {
    if (!mod_highlight.initialized) {
      importExternalStyle(kModPath+"highlightjs/style.min.css");
      importExternalScript(kModPath+"highlightjs/highlight.min.js");
      mod_highlight.initialized = true;
    }
    while (typeof hljs === "undefined") {
      await sleep(100);
    }
  },
  alter: async (st) => {
    let pro = Array.from(document.querySelectorAll("pre code")).map(async (e) => {
      await mod_highlight.init_lazy();
      hljs.highlightElement(e);
    });
    await Promise.all(pro);
  },
};


// enables KaTeX feature
const mod_math = {
  initialized: false,
  init_lazy: async () => {
    if (!mod_math.initialized) {
      importExternalStyle(kModPath+"katex/katex.min.css");
      importExternalScript(kModPath+"katex/katex.min.js");
      mod_math.initialized = true;
    }
    while (typeof katex === "undefined") {
      await sleep(100);
    }
  },
  alter: async (st) => {
    const paras = st.querySelectorAll("p");

    // modify paragraph surrounded by $$
    let pro = [];
    paras.forEach(async (e) => {
      const text  = e.innerText;
      const match =
        text.length > 4 &&
        text.substr(0, 2) == "$$" &&
        text.substr(text.length-2) == "$$";
      if (match) {
        const expr = text.substr(2, text.length-4);
        pro.push(mod_math.init_lazy().
          then(() => {
            e.innerHTML = katex.renderToString(expr, {output: "html", displayMode: true});
          }));
      }
    });
    await Promise.all(pro);

    // modify paragraph including inline expr ($...$)
    pro = Array.from(paras).map(async (e) => {
      let l = 0;
      let r = -1;
      for (;;) {
        const text = e.innerHTML;

        l = text.indexOf("$", r+1);
        if (l == -1) break;
        l += 1;
        r = text.indexOf("$", l);
        if (r == -1) break;

        await mod_math.init_lazy();
        const expr     = text.substr(l, r-l);
        const rendered = katex.renderToString(expr, {output: "html", displayMode: false})
        e.innerHTML = text.substr(0, l-1) + rendered + text.substr(r+1);
      }
    });
    await Promise.all(pro);
  },
};

})();
