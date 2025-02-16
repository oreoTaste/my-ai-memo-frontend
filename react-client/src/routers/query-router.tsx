import { useState, useEffect } from "react";
import axios from "axios";
import { useDarkMode } from "../DarkModeContext";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import DarkButton from "../components/DarkButton";

export const QueryRouter = () => {
  const { isDarkMode } = useDarkMode();
  const navigate = useNavigate();
  const [inputQuery, setInputQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [inputParams, setInputParams] = useState("");


  const sendQuery = async () => {
    if(inputQuery.toUpperCase().includes("INSERT ") || inputQuery.toUpperCase().includes("UPDATE ") || 
      inputQuery.toUpperCase().includes("DELETE ") || inputQuery.toUpperCase().includes("DROP ") ||
      inputQuery.toUpperCase().includes("GRANT ") || inputQuery.toUpperCase().includes("REVOKE ")) {
      alert("금지된 명령어입니다.");
      return false;
    }

    const newInputQuery = inputQuery.replace("SELECT ", "SELECT /*+ GATHER_PLAN_STATISTICS */ ");
    const queryParamLength = newInputQuery.match(/\:\d{1,}/g)?.length || 0;
    const params = [...JSON.parse(`[${inputParams}]`)];

    if(queryParamLength !== params.length) {
      alert("파라미터 개수가 일치하지 않습니다.");
      return false
    }

    let response = await axios.post(
      `/query/execute`,
      { query: newInputQuery,  params},
      { withCredentials: true }
    );
    if (response?.data?.result) {
      console.log(response?.data?.queryResult);
    };

    // 실행계획 추출
    response = await axios.post(
      `/query/execute`,
      { query: "SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY_CURSOR(NULL, NULL, 'ALLSTATS LAST'))",  params: []},
      { withCredentials: true }
    );
    if (response?.data?.result) {
      console.log("실행계획");
      setAnswer(response?.data?.queryResult.map((el: any)=>el.PLAN_TABLE_OUTPUT).join('\n'));
      console.log(response?.data?.queryResult);
    };
  }

  return (
    <div
      className={`flex min-h-screen flex-col items-center pt-16 text-gray-800
        ${isDarkMode ? "bg-gray-900" : "bg-gray-200"}`}
    >
      {/* 상단 탭 */}
      <Navbar isDarkMode={isDarkMode} />
      {/* 다크 모드 버튼 */}
      <DarkButton />

      <div
        className={`${
          isDarkMode
            ? "bg-gray-800 text-white border border-gray-600"
            : "bg-white text-gray-800 border border-gray-300"
        } w-full max-w-4xl p-6 rounded-lg shadow-lg mb-8`}
      >
          <textarea
            placeholder="수행할 쿼리 입력. 예시) SELECT :1 FROM DUAL"
            className={`${
              isDarkMode
                ? "bg-gray-800 text-white border-gray-600 hover:bg-gray-600"
                : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"
            } w-full p-2 h-64 border rounded resize-none placeholder-gray-500 font-mono`}
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
          />
          <textarea
            placeholder='수행할 파라미터 입력. 예시) "A"'
            className={`${
              isDarkMode
                ? "bg-gray-800 text-white border-gray-600 hover:bg-gray-600"
                : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"
            } w-full p-2 h-16 border rounded resize-none placeholder-gray-500 font-mono`}
            value={inputParams}
            onChange={(e) => setInputParams(e.target.value)}
          />
          {/* <input type="file" multiple ref={fileInputRef} onChange={handleFileChange} /> */}
          {/* {file && <p>선택한 파일: {file.name}</p>} */}
          <div
            className={`flex items-center justify-between mt-4 ${
              isDarkMode ? "text-gray-300" : "text-gray-700"
            }`}
          >

            <button
              onClick={sendQuery}
              className={`${
                isDarkMode
                  ? "bg-indigo-700 text-white hover:bg-indigo-900"
                  : "bg-indigo-600 text-white hover:bg-indigo-700"
              } px-4 py-2 rounded  transition`}
            >
              추가하기
            </button>
          </div>
          <textarea
            placeholder="결과 입력"
            className={`${
              isDarkMode
                ? "bg-gray-800 text-white border-gray-600 hover:bg-gray-600"
                : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"
            } mt-4 w-full p-2 h-64 border rounded resize-none placeholder-gray-500 font-mono`}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
          />

      </div>
    </div>
  );
};
