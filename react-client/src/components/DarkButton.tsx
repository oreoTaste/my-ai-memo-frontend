import { useDarkMode } from "../contexts/DarkModeContext";

const DarkButton = () => {
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  return (
    <button
      onClick={toggleDarkMode}
      className="z-10 absolute top-4 right-4 p-2 bg-transparent border-2 border-indigo-300 text-indigo-300 rounded-full hover:bg-indigo-300 hover:text-white transition-colors duration-300"
    >
      {isDarkMode ? "🌙" : "🌞"}
    </button>
  );
};

export default DarkButton;
