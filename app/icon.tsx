import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 7,
          background: '#2e7d32',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="28"
          height="28"
          viewBox="0 0 32 32"
          fill="none"
        >
          <circle cx="16" cy="16" r="13" stroke="white" strokeWidth="1.5" />
          <polygon points="16,11 20.76,14.46 18.94,20.05 13.06,20.05 11.24,14.46" fill="white" />
          <line x1="16" y1="11" x2="16" y2="3" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="20.76" y1="14.46" x2="28.38" y2="12" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="18.94" y1="20.05" x2="23.64" y2="26.53" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="13.06" y1="20.05" x2="8.36" y2="26.53" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="11.24" y1="14.46" x2="3.62" y2="12" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
    ),
    { width: 32, height: 32 },
  );
}
