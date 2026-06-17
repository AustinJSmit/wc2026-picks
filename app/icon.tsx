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
          viewBox="0 0 20 20"
          fill="none"
          stroke="white"
          strokeWidth="1.4"
          strokeLinecap="round"
        >
          <circle cx="10" cy="10" r="8.5" />
          <path d="M1.5 10 Q10 6.5 18.5 10" />
          <path d="M5.75 2.64 C7 6.5 13 13.5 14.25 17.36" />
          <path d="M14.25 2.64 C13 6.5 7 13.5 5.75 17.36" />
        </svg>
      </div>
    ),
    { width: 32, height: 32 },
  );
}
