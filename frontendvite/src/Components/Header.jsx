import { useState } from "react";
import { useNavigate } from "react-router-dom";
import close from '../assets/close.svg';
import logo from '../assets/logo.svg';
import menu from '../assets/menu.svg';

const Header = () => {
  const [active, setActive] = useState("Home");
  const [toggle, setToggle] = useState(false);
  const navigate = useNavigate(); // For programmatic navigation

  const navItems = [
    { title: "Home", path: "/" },
    { title: "Upload", path: "/upload" },
    { title: "Profile", path: "/profile" },
  ];

  const handleNavigation = (navTitle, path) => {
    setActive(navTitle);
    navigate(path); // Navigate to the correct path
  };

  return (
    <nav className="w-full flex py-6 justify-between items-center navbar">
      <img
        src={logo}
        alt="name"
        className="w-[124px] h-[30px]"
        style={{ filter: "invert(1)" }}
      />

      <ul className="list-none sm:flex hidden justify-end items-center flex-1">
        {navItems.map(({ title, path }, index) => (
          <li
            key={title}
            className={`font-poppins font-normal cursor-pointer text-[16px] ${
              active === title ? "text-white" : "text-dimWhite"
            } ${index !== navItems.length - 1 ? "mr-10" : ""}`}
            onClick={() => handleNavigation(title, path)}
          >
            {title}
          </li>
        ))}
      </ul>

      <div className="sm:hidden flex flex-1 justify-end items-center">
        <img
          src={toggle ? close : menu}
          alt="menu"
          className="w-[24px] h-[24px] object-contain"
          onClick={() => setToggle((prev) => !prev)}
        />

        <div
          className={`${
            !toggle ? "hidden" : "flex"
          } p-6 bg-black-gradient absolute top-20 right-0 mx-4 my-2 min-w-[140px] rounded-xl sidebar`}
        >
          <ul className="list-none flex justify-end items-start flex-1 flex-col">
            {navItems.map(({ title, path }, index) => (
              <li
                key={title}
                className={`font-poppins font-medium cursor-pointer text-[16px] ${
                  active === title ? "text-white" : "text-dimWhite"
                } ${index !== navItems.length - 1 ? "mb-4" : ""}`}
                onClick={() => {
                  handleNavigation(title, path);
                  setToggle(false); // Close mobile menu after selection
                }}
              >
                {title}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Header;
