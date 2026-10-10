import React, { useEffect, useRef } from 'react';

export function Icon({ name, size = 20 }) {
  const paths = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="2" />
        <rect x="14" y="3" width="7" height="7" rx="2" />
        <rect x="3" y="14" width="7" height="7" rx="2" />
        <rect x="14" y="14" width="7" height="7" rx="2" />
      </>
    ),
    list: (
      <>
        <path d="M9 5h12M9 12h12M9 19h12" />
        <path d="M3 5h1M3 12h1M3 19h1" />
      </>
    ),
    check: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12 3 3 5-6" />
      </>
    ),
    inbox: (
      <>
        <path d="m5 4-3 10v6h20v-6L19 4Z" />
        <path d="M2 14h6l2 3h4l2-3h6" />
      </>
    ),
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 5 5" />
      </>
    ),
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v1m0 18v1M2 12h1m18 0h1M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1" />
      </>
    ),
    moon: <path d="M21 13A9 9 0 0 1 11 3a9 9 0 1 0 10 10Z" />,
    plus: <path d="M12 5v14M5 12h14" />,
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    focus: <path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    leaf: (
      <>
        <path d="M20 3C9 2 3 7 5 14s13 8 15-11Z" />
        <path d="M4 21 15 9" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] || paths.grid}
    </svg>
  );
}

export function Modal({ open, onClose, titleId, children, className = '', dialogRef }) {
  const internalRef = useRef(null);
  const ref = dialogRef || internalRef;
  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog.open) {
      dialog.showModal();
      dialog.querySelector('[data-autofocus]')?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className={className}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        )
          ref.current.close();
      }}
    >
      {children}
    </dialog>
  );
}

export function Avatars({ members }) {
  return (
    <span className="avatar-stack" aria-label={`${members.length} collaborators`}>
      {members.map((member, index) => (
        <span key={member} className={`avatar a${index % 4}`}>
          {member}
        </span>
      ))}
    </span>
  );
}

export function ProjectArt({ variant = 'mint', large = false }) {
  return (
    <div className={`project-art art-${variant} ${large ? 'large' : ''}`} aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
      <span>
        {variant === 'mint' ? 'a' : variant === 'purple' ? 'o' : variant === 'orange' ? 'f' : 's'}
        <b>®</b>
      </span>
      <small>
        {variant === 'mint'
          ? 'A NEW PERSPECTIVE'
          : variant === 'purple'
            ? 'IN GOOD ORBIT'
            : variant === 'orange'
              ? 'STAY CURIOUS'
              : 'MAKE IT MATTER'}
      </small>
    </div>
  );
}

export function Progress({ value, color = 'mint', label = 'Project progress' }) {
  return (
    <div
      className={`progress-track ${color}`}
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span style={{ width: `${value}%` }} />
    </div>
  );
}
