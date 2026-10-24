import type { SVGProps } from "react";

/**
 * Stylised dress form + three garments. All share one 300×400 viewBox so they
 * stack perfectly inside the mirror. Flat fills only (no gradient ids) so they
 * are safe to render many times on a page.
 */

type Props = SVGProps<SVGSVGElement>;

const base = {
  viewBox: "0 0 300 400",
  fill: "none",
  preserveAspectRatio: "xMidYMid meet",
  "aria-hidden": true,
} as const;

export function FormBase(props: Props) {
  return (
    <svg {...base} {...props}>
      {/* stand */}
      <rect x="146.5" y="268" width="7" height="78" rx="3" fill="#9499C2" />
      <ellipse cx="150" cy="350" rx="46" ry="8" fill="#9499C2" />
      <ellipse cx="150" cy="347" rx="46" ry="8" fill="#BFC3DD" />
      {/* torso */}
      <path
        d="M139 26C139 40 136 48 114 56C100 61 92 66 90 80C88 102 98 134 107 160C107 192 98 214 100 238L106 272H194L200 238C202 214 193 192 193 160C202 134 212 102 210 80C208 66 200 61 186 56C164 48 161 40 161 26Z"
        fill="#C9CDE4"
      />
      {/* shaded right half */}
      <path
        d="M150 26H161C161 40 164 48 186 56C200 61 208 66 210 80C212 102 202 134 193 160C193 192 202 214 200 238L194 272H150Z"
        fill="#131845"
        opacity="0.09"
      />
      <ellipse cx="150" cy="26" rx="11" ry="3.5" fill="#9499C2" />
    </svg>
  );
}

export function TeeGarment(props: Props) {
  return (
    <svg {...base} {...props}>
      <path
        d="M114 56C128 66 172 66 186 56L228 80L212 118L196 108L198 200H102L104 108L88 118L72 80Z"
        fill="#4C5CFF"
      />
      <path
        d="M150 66L186 56L228 80L212 118L196 108L198 200H150Z"
        fill="#0B0E2B"
        opacity="0.13"
      />
      <path d="M131 58C139 77 161 77 169 58" stroke="#2A36C2" strokeWidth="5" strokeLinecap="round" />
      <path d="M105 193H195" stroke="#fff" strokeOpacity="0.6" strokeWidth="1.5" strokeDasharray="5 4" />
      <path d="M92 112L106 103M208 112L194 103" stroke="#fff" strokeOpacity="0.45" strokeWidth="1.5" strokeDasharray="4 3" />
    </svg>
  );
}

export function BlazerGarment(props: Props) {
  return (
    <svg {...base} {...props}>
      <path
        d="M112 54C128 62 172 62 188 54L232 76L246 176L222 182L204 108L202 232H98L96 108L78 182L54 176L68 76Z"
        fill="#FFC83D"
      />
      <path
        d="M150 62L188 54L232 76L246 176L222 182L204 108L202 232H150Z"
        fill="#0B0E2B"
        opacity="0.11"
      />
      {/* shirt under the opening */}
      <path d="M134 58L150 142L166 58Z" fill="#fff" />
      {/* lapels */}
      <path d="M122 56L150 142L134 150L112 96Z" fill="#E9A900" />
      <path d="M178 56L150 142L166 150L188 96Z" fill="#E9A900" />
      <path d="M150 142V232" stroke="#E9A900" strokeWidth="2" />
      <circle cx="144" cy="172" r="3" fill="#131845" />
      <circle cx="144" cy="198" r="3" fill="#131845" />
      <path d="M100 225H200" stroke="#131845" strokeOpacity="0.4" strokeWidth="1.5" strokeDasharray="5 4" />
    </svg>
  );
}

export function DressGarment(props: Props) {
  return (
    <svg {...base} {...props}>
      <path
        d="M120 52L128 54C134 80 166 80 172 54L180 52L192 72C190 100 184 124 190 160L214 292H86L110 160C116 124 110 100 108 72Z"
        fill="#1B2260"
      />
      <path
        d="M150 70C160 70 168 66 172 54L180 52L192 72C190 100 184 124 190 160L214 292H150Z"
        fill="#0B0E2B"
        opacity="0.22"
      />
      <path d="M108 164H192" stroke="#FFC83D" strokeWidth="5" strokeLinecap="round" />
      <path d="M126 174L110 286M150 174V288M174 174L190 286" stroke="#fff" strokeOpacity="0.1" strokeWidth="1.5" />
      <path d="M92 284H208" stroke="#fff" strokeOpacity="0.5" strokeWidth="1.5" strokeDasharray="5 4" />
    </svg>
  );
}
