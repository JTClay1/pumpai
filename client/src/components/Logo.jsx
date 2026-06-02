import logo from "../assets/pumpai-logo.png";

function Logo({ className = "site-logo", alt = "PumpAI" }) {
  return <img src={logo} alt={alt} className={className} />;
}

export default Logo;