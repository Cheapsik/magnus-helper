const Logo = ({ className = "h-7 w-7" }: { className?: string }) => (
    <svg
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M16 2L4 7v10c0 7.5 5.5 13.5 12 16 6.5-2.5 12-8.5 12-16V7L16 2z"
        stroke="currentColor"
        strokeWidth="1.5"
        className="text-primary"
      />
      <path
        d="M16 6L8 9.5v6.5c0 5 3.5 9 8 10.5 4.5-1.5 8-5.5 8-10.5V9.5L16 6z"
        fill="currentColor"
        className="text-primary/15"
      />
      <path
        d="M12 13h8M12 16.5h8M12 20h5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        className="text-primary"
      />
    </svg>
  );
  
  export default Logo;
  