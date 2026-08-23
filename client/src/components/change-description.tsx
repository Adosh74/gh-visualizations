import { useState } from 'react';

interface Props {
  text: string;
  /** Roughly the number of lines shown before the clamp bites. */
  clampAfterChars?: number;
}

/**
 * Design item 2 — the description that came with a change. Long bodies are
 * clamped so one verbose commit message cannot push the rest of the feed off
 * the page; the full text is always in the DOM, one click away.
 */
export function ChangeDescription({ text, clampAfterChars = 240 }: Props) {
  const [expanded, setExpanded] = useState(false);
  const clampable = text.length > clampAfterChars;

  return (
    <>
      <p className={expanded || !clampable ? 'feed__body feed__body--expanded' : 'feed__body'}>
        {text}
      </p>
      {clampable
        ? (
            <button
              type="button"
              className="feed__more"
              aria-expanded={expanded}
              onClick={() => setExpanded(value => !value)}
            >
              {expanded ? 'Show less' : 'Show more'}
            </button>
          )
        : null}
    </>
  );
}
