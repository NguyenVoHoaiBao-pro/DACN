import "./Logo.css";

const Logo = () => {
  return (
    <div className="logo">
      <a href="/" className="logo-link">
        <div className="logo-icon">
          {/* Shopping bag icon như trong thiết kế */}
          <svg
            width="40"
            height="40"
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect width="40" height="40" rx="8" fill="#FF7A00" />
            <path
              d="M10 15H30L28.5 27H11.5L10 15Z"
              fill="white"
              stroke="white"
              strokeWidth="1"
            />
            <path
              d="M14 12C14 10.9 14.9 10 16 10H24C25.1 10 26 10.9 26 12V15H14V12Z"
              fill="none"
              stroke="white"
              strokeWidth="2"
            />
            <circle cx="16" cy="31" r="2" fill="white" />
            <circle cx="24" cy="31" r="2" fill="white" />
          </svg>
        </div>
        <span className="logo-text">Electro</span>
      </a>
    </div>
  );
};

export default Logo;
