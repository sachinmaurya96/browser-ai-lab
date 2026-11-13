"use client";
/**
 * Quote mode inspector: a library of famous quotes (by category, searchable,
 * or at random), the quote, author and source fields, the typography, and
 * preset looks. Quote cards are post content with variant "quote".
 */
import { memo, useMemo, useState } from "react";
import {
  type FamousQuote,
  type PostContent,
  type QuoteCategory,
  type QuoteStyle,
  type Scene,
  FAMOUS_QUOTES,
  QUOTE_CATEGORIES,
  QUOTE_STYLES,
  applyStylePatch,
  createScene,
} from "../engine";
import { Icon } from "../icons";
import { Segmented } from "../ui/controls";
import { TrayTitle } from "./TrayTitle";
import { useApp, useScene } from "./context";
import { SceneThumb } from "./SceneThumb";

function useQuote(): PostContent | null {
  return useScene((s) =>
    s.scene.content.kind === "post" && s.scene.content.variant === "quote" ? s.scene.content : null,
  );
}

const pick = (q: FamousQuote): Partial<PostContent> => ({ text: q.text, name: q.author, handle: q.source });

export const QuoteTray = memo(function QuoteTray({ bare = false }: { bare?: boolean }) {
  const app = useApp();
  const c = useQuote();
  const [cat, setCat] = useState<QuoteCategory | "All">("All");
  const [query, setQuery] = useState("");
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FAMOUS_QUOTES.filter(
      (x) =>
        (cat === "All" || x.category === cat) &&
        (!q || x.text.toLowerCase().includes(q) || x.author.toLowerCase().includes(q)),
    );
  }, [cat, query]);
  if (!c) return null;
  const random = () => {
    const pool = list.length ? list : FAMOUS_QUOTES;
    const others = pool.filter((x) => x.text !== c.text);
    const q = (others.length ? others : pool)[Math.floor(Math.random() * (others.length || pool.length))]!;
    app.setPost(pick(q));
    app.announce(`Quote by ${q.author}`);
  };
  const body = (
    <>
      <div className="quote-tools">
        <span className="input quote-search">
          <Icon name="search" size="xs" />
          <input
            value={query}
            placeholder="Search"
            aria-label="Search quotes or people"
            data-testid="quote-search"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
          />
        </span>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          data-testid="quote-random"
          onClick={random}
          title="A random quote from this list"
        >
          <Icon name="shuffle" size="sm" /> Random
        </button>
      </div>
      <div className="quote-cats" role="radiogroup" aria-label="Category">
        {(["All", ...QUOTE_CATEGORIES] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={cat === k}
            className={`quote-cat${cat === k ? " on" : ""}`}
            onClick={() => setCat(k)}
          >
            {k}
          </button>
        ))}
      </div>
      <ul className="quote-list" aria-label="Famous quotes" data-testid="quote-list">
        {list.map((q) => {
          const on = q.text === c.text && q.author === c.name;
          return (
            <li key={q.text}>
              <button
                type="button"
                className={`quote-item${on ? " on" : ""}`}
                aria-pressed={on}
                onClick={() => app.setPost(pick(q))}
              >
                <span className="qi-text">“{q.text}”</span>
                <span className="qi-author">{q.author}</span>
              </button>
            </li>
          );
        })}
        {!list.length && <li className="note">No quotes match. Type your own below.</li>}
      </ul>
      <label className="field-stack">
        <span className="field-label">
          Quote <span className="mono muted">{c.text.length}</span>
        </span>
        <span className="input area">
          <textarea
            value={c.text}
            rows={4}
            placeholder="Type a quote…"
            data-testid="quote-text"
            onChange={(e) => app.setPost({ text: e.target.value }, "post:text")}
            onKeyDown={(e) => e.stopPropagation()}
          />
        </span>
      </label>
      <div className="field-grid">
        <label className="field-stack">
          <span className="field-label">Author</span>
          <span className="input">
            <input
              value={c.name}
              placeholder="Who said it"
              data-testid="quote-author"
              onChange={(e) => app.setPost({ name: e.target.value }, "post:name")}
              onKeyDown={(e) => e.stopPropagation()}
            />
          </span>
        </label>
        <label className="field-stack">
          <span className="field-label">Source</span>
          <span className="input">
            <input
              value={c.handle}
              placeholder="Book, speech, year"
              data-testid="quote-source"
              onChange={(e) => app.setPost({ handle: e.target.value }, "post:handle")}
              onKeyDown={(e) => e.stopPropagation()}
            />
          </span>
        </label>
      </div>
    </>
  );
  if (bare) return <div className="tray quote-tray">{body}</div>;
  return (
    <section className="tray quote-tray" aria-labelledby="t-quote" data-testid="quote-tray">
      <div className="tray-head">
        <TrayTitle id="t-quote">Quote</TrayTitle>
        <span className="meta">{FAMOUS_QUOTES.length} famous quotes</span>
      </div>
      {body}
    </section>
  );
});

export const QuoteTypeTray = memo(function QuoteTypeTray({ bare = false }: { bare?: boolean }) {
  const app = useApp();
  const c = useQuote();
  if (!c) return null;
  const style = c.quoteStyle ?? "classic";
  const body = (
    <>
      <div className="sub">Typography</div>
      <Segmented<QuoteStyle>
        label="Typography"
        value={style}
        onChange={(quoteStyle) => app.setPost({ quoteStyle })}
        options={[
          { value: "classic", label: "Classic" },
          { value: "modern", label: "Modern" },
          { value: "bold", label: "Bold" },
        ]}
      />
      <p className="note">
        {style === "classic"
          ? "Serif words, a large quote mark and the author in small capitals."
          : style === "modern"
            ? "Clean sans words beside an accent rule, left aligned."
            : "Heavy display type for short, punchy lines."}
      </p>
      <div className="sub">Alignment</div>
      <Segmented<"center" | "left">
        label="Alignment"
        value={style === "modern" ? "left" : (c.align ?? "center")}
        onChange={(align) => app.setPost({ align })}
        options={[
          { value: "center", label: "Centre", disabled: style === "modern" },
          { value: "left", label: "Left" },
        ]}
      />
    </>
  );
  if (bare) return <div className="tray">{body}</div>;
  return (
    <section className="tray" aria-labelledby="t-quote-type" data-testid="quote-type-tray">
      <div className="tray-head">
        <TrayTitle id="t-quote-type">Typography</TrayTitle>
      </div>
      {body}
    </section>
  );
});

function useQuoteScenes(c: PostContent | null): { id: string; name: string; scene: Scene }[] {
  return useMemo(() => {
    if (!c) return [];
    return QUOTE_STYLES.map((st) => {
      let s = createScene({
        content: { ...c, theme: st.theme, accent: st.accent, quoteStyle: st.quoteStyle },
      });
      s = applyStylePatch(s, st.patch);
      s = { ...s, canvas: { size: { kind: "aspect", ratioW: 4, ratioH: 3 }, padding: 70 } };
      return { id: st.id, name: st.name, scene: s };
    });
  }, [c]);
}

export const QuotePresetsTray = memo(function QuotePresetsTray({ bare = false }: { bare?: boolean }) {
  const app = useApp();
  const c = useQuote();
  const current = useScene((s) => s.scene.meta.stylePresetId);
  const scenes = useQuoteScenes(c);
  if (!c) return null;
  const grid = (
    <div className={bare ? "rail" : "presets two"}>
      {scenes.map(({ id, name, scene }) => (
        <button
          key={id}
          type="button"
          className={`preset${current === id ? " on" : ""}`}
          aria-pressed={current === id}
          aria-label={`${name} quote style`}
          onClick={() => app.applyPostStyle(id)}
        >
          <div className="thumb">
            <SceneThumb scene={scene} target={bare ? 110 : 140} priority={8} />
          </div>
          <span className="name">{name}</span>
        </button>
      ))}
    </div>
  );
  if (bare) return grid;
  return (
    <section className="tray" aria-labelledby="t-quote-styles" data-testid="quote-styles-tray">
      <div className="tray-head">
        <TrayTitle id="t-quote-styles">Presets</TrayTitle>
      </div>
      {grid}
    </section>
  );
});
