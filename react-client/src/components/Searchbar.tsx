const Searchbar = ({ isDarkMode, value, onChange }: { isDarkMode: boolean, value: string, onChange: (query: string) => void }) => {
  return (
    <div className="absolute top-4 flex items-center justify-center w-full max-w-4xl px-6 bg-transparent">
      <input
        type="text"
        placeholder="Search..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`flex-grow max-w-md px-4 py-2 mr-4 border-b bg-transparent focus:outline-none transition-all duration-200
          placeholder-gray-500
          ${isDarkMode ? "border-gray-600 hover:bg-gray-700 focus:border-indigo-500" : "border-gray-300 hover:bg-gray-100 focus:border-indigo-400"}
        `}
      />
    </div>
  );
};

export default Searchbar;
