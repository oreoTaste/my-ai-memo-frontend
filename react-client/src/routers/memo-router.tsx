import { useState, useEffect, useRef, useMemo } from "react";
import axios from "axios";
import { useDarkMode } from "../DarkModeContext";
import Navbar from "../components/Navbar";
import DarkButton from "../components/DarkButton";
import secureLocalStorage from "react-secure-storage";
import Searchbar from "../components/Searchbar";

// 사용자와 메모 데이터 타입 정의
interface User {
  id: string;
  loginId: string;
  name: string;
  isActive: boolean;
  createdAt: string;
}

interface UploadFile {
  fileName: string; // 파일 이름은 문자열입니다.
}
interface Memo {
  subject: string;
  title: string;
  answer: string;
  raw: string;
  seq: number;
  insertId: string;
  createdAt: string;
  modifiedAt: string;
  files: UploadFile[];
}

export const MemoRouter = () => {
  const [user, setUser] = useState<User | null>(null);
  const [memos, setMemos] = useState<Memo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { isDarkMode } = useDarkMode();

  const [title, setTitle] = useState<string>("");
  const [askAI, setAskAI] = useState<boolean>(false);
  const [raw, setRaw] = useState<string>("");

  // 수정 상태 관리
  const [editMemoId, setEditMemoId] = useState<number | null>(null); // 현재 수정 중인 메모 ID
  const [editMemoContent, setEditMemoContent] = useState<{
    title: string;
    subject?: string;
    raw: string;
    answer: string;
  }>({
    title: "",
    subject: "",
    raw: "",
    answer: "",
  }); // 수정 중인 메모 내용
  const [memoHeights, setMemoHeights] = useState<Record<number, number>>({});
  const textareaRefs = useRef<(HTMLTextAreaElement | null)[]>([]);
  const [files, setFiles] = useState<File[] | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const newMemoHeights: Record<number, number> = {};  // 타입을 명시적으로 설정
    memos.forEach((memo, index) => {
      if (textareaRefs.current[index]) {
        newMemoHeights[memo.seq] = textareaRefs.current[index]?.scrollHeight || 0;
      }
    });
    setMemoHeights(newMemoHeights);
  }, [memos]);
  
  // 수정 시작
  const startEditing = (memo: {
    title: string;
    subject?: string;
    raw: string;
    seq: number;
    answer: string;
  }) => {
    setEditMemoId(memo.seq);
    setEditMemoContent({
      title: memo.title,
      subject: memo.subject,
      raw: memo.raw,
      answer: memo.answer,
    });
  };

  // 수정취소
  const cancelMemo = (memoId: number) => {
    setEditMemoId(null);
    setEditMemoContent({
      title: "",
      subject: "",
      raw: "",
      answer: "",
    });
  };

  // 수정 저장
  const saveMemo = async (memoId: number) => {
    let prevMemo = memos.find((el) => el.seq === memoId);
    if (
      prevMemo?.answer === editMemoContent.answer &&
      prevMemo?.raw === editMemoContent.raw &&
      prevMemo?.subject === editMemoContent.subject &&
      prevMemo?.title === editMemoContent.title
    ) {
      cancelMemo(memoId);
    } else {
      try {
        // 서버로 수정된 내용 전송 (필요 시 API 호출)
        let response = await axios.post(
          `/memo/update`,
          { ...editMemoContent, seq: editMemoId },
          { withCredentials: true }
        );
        if (response.data.result) {
          // 로컬 상태 업데이트
          const updatedMemos = memos.map((memo) =>
            memo.seq === memoId
              ? {
                  ...memo,
                  ...editMemoContent,
                  modifiedAt: new Date().toISOString(),
                }
              : memo
          );
          setMemos(updatedMemos);
        } else {
          alert("메모 수정 중 오류가 발생했습니다.");
        }
      } catch (error) {
        console.error("메모 수정 실패:", error);
        alert("메모 수정 중 오류가 발생했습니다.");
      } finally {
        // 수정 상태 종료
        setEditMemoId(null);
        setEditMemoContent({ title: "", subject: "", raw: "", answer: "" });
      }
    }
  };

  useEffect(() => {
    const storedUser = JSON.parse(String(secureLocalStorage.getItem("user"))) as User;
    if (storedUser) {
      setUser(storedUser);
    }
  }, []);

  useEffect(() => {
    if (user) {
      const fetchMemos = async () => {
        setIsLoading(true);
        try {
          const response = await axios.get(`/memo/list`, {
            withCredentials: true,
          });

          if (response.data.result) {
            const sortedMemos = response.data.memos.sort((a: Memo, b: Memo) => {
              return (
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime()
              );
            });
            setMemos(sortedMemos);
          } else {
            setMemos([]);
          }
        } catch (err) {
          console.error("메모 데이터를 가져오는 중 오류 발생:", err);
          setMemos([]);
        } finally {
          setIsLoading(false);
        }
      };

      fetchMemos();
    }
  }, [user]);

  const [expandedMemoIds, setExpandedMemoIds] = useState<Number[]>([]); // 확장된 메모의 ID 저장

  const toggleExpanded = (seq: number) => {
    setExpandedMemoIds(
      (prev) =>
        prev.includes(seq)
          ? prev.filter((id) => id !== seq) // 이미 확장된 상태면 제거
          : [...prev, seq] // 확장되지 않은 상태면 추가
    );
  };

  const addMemo = async () => {
    if (!title || !raw) {
      alert("제목과 내용을 모두 입력해주세요.");
      return;
    }

    let [answer, subject]: [string, string] = ["", ""];

    if(askAI) {
      try {
        const result = await axios.post(
          "/api/gemini",
          JSON.stringify({
            text: `다음의 글에서 주제를 찾고 답변할 게 있다면 답변도 해줘. 이때 답변은 항상 @_@를 기준으로 두 부분으로 나뉘어야 해. @_@ 앞에는 주제나 질문 요약을 쓰고, 뒤에는 그에 대한 조언을 쓰는 거야. 그리고 @_@는 한 번만 써야 해. 간단하지?
                  "${raw}"`
          }),
          { headers: { "Content-Type": "application/json" } }
        );
        let aiAnswers = result.data?.candidates?.[0]?.content?.parts?.[0]?.text
          .split("@_@")
          .map((el: string) => el.trim());
        subject = String(aiAnswers[0]).replaceAll(/^(주제|요약|응답|조언)\s?:\s?/g,"");
        answer = aiAnswers[1];
      } catch (error) {}  
    }

    const newMemo: Memo = {
      raw,
      title,
      subject,
      answer,
      seq: 0, // 사용x
      insertId: "", // 사용x
      createdAt: "", // 사용x
      modifiedAt: "", // 사용x
      files: [],
    };

    try {
      let formData = new FormData();
      if(files) {
        
        if (files) {
          for(let file of files) {
            console.log(file);
            formData.append("files", file);
          }
        }
        setFiles(null);
      }
      // 추가로 req.body의 키/값을 FormData에 추가
      for (const [key, value] of Object.entries(newMemo)) {
        formData.append(key, value);
      }
      console.log(formData);
  
      const response = await axios.post(`/memo/insert`
        , formData
        , { withCredentials: true
          , headers: { "content-type": "multipart/form-data" }
          , maxContentLength: 1024 ** 3 // 1GB로 설정
          , maxBodyLength: 1024 ** 3 // 1GB로 설정
      });

      if (response.data.result) {
        newMemo.seq = response.data?.insertResult?.seq;
        newMemo.createdAt = response.data?.insertResult?.createdAt;
        newMemo.modifiedAt = response.data?.insertResult?.modifiedAt;
        for(let file of files || []) {
          newMemo.files.push({fileName: file.name})
        }

        setMemos((prev) => [newMemo, ...prev]);
        setTitle("");
        setRaw("");
        setAskAI(false);
        alert("메모가 성공적으로 추가되었습니다.");
      } else {
        alert("메모 추가에 실패했습니다. 다시 시도해주세요.");
      }
    } catch (err) {
      console.error("메모 추가 중 오류 발생:", err);
      alert("메모 추가 중 오류가 발생했습니다.");
    }
  };

  const deleteMemo = async (seq: number) => {
    try {
      let foundMemo = memos.find((el) => el.seq === seq) as Memo;
      const askComment = `[${foundMemo.title}]를 삭제하시겠습니까?`;
      if (window.confirm(askComment)) {
        const response = await axios.delete(`/memo/delete?seq=${seq}`, {
          withCredentials: true,
        });

        if (response.data.result) {
          setMemos((prev) => prev.filter((memo) => memo.seq !== seq));
          alert("메모가 성공적으로 삭제되었습니다.");
        } else {
          alert("메모 삭제에 실패했습니다.");
        }
      }
    } catch (err) {
      console.error("메모 삭제 중 오류 발생:", err);
      alert("메모 삭제 중 오류가 발생했습니다.");
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if(event.target.files){
      setFiles(Array.from(event.target.files));
    }
  };

  const handleDownload = async (memoSeq: number, fileName: string) => {
    try {
      const response = await axios.get(`/file/download`, {
        params: { fileFrom: 'MEMO', seq: memoSeq, fileName }, // 해당 파라미터로 요청
        responseType: 'blob',  // 파일 다운로드를 위해 blob으로 설정
        headers: {
          'Cache-Control': 'no-cache', // 캐시를 사용하지 않도록 설정
          'If-Modified-Since': '0', // If-Modified-Since 무력화
          'If-None-Match': '', // If-None-Match 무력화
          Accept: 'application/octet-stream', // 명시적으로 blob 타입 요청
        },
        withCredentials: true,  // 쿠키가 필요한 경우
      });
  
      // 다운로드할 파일 생성
      const blob = new Blob([response.data], { type: 'application/octet-stream' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;

      link.setAttribute('download', fileName);  // 다운로드 시 파일명 설정
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);  // 다운로드 후 링크 삭제
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  const filteredMemos = memos.filter((item) => {
    if (item?.title?.toLowerCase().includes(query.toLowerCase())) { // 제목
      return true;
    }
    if (item?.raw?.toLowerCase().includes(query.toLowerCase())) { // 내용
      return true;
    }
    if (item?.files?.findIndex(el => el.fileName.toLowerCase().includes(query.toLowerCase())) >= 0) { // 파일
      return true;
    }
    if (item?.subject?.toLowerCase().includes(query.toLowerCase())) { // 주제
      return true;
    }
    if (item?.answer?.toLowerCase().includes(query.toLowerCase())) { // 응답
      return true;
    }
    return false;
  });

  if (isLoading) {
    return (
      <div
      className={`flex flex-col items-center pt-16 min-h-screen ${
        isDarkMode ? "bg-gray-900 text-white" : "bg-gray-200 text-gray-800"
      }`}
      >
        {/* 상단 탭 */}
        <Navbar isDarkMode={isDarkMode} />
        {/* 다크 모드 버튼 */}
        <DarkButton />
        <div className="text-center py-4">로딩 중...</div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center pt-16 min-h-screen ${
        isDarkMode ? "bg-gray-900 text-white" : "bg-gray-200 text-gray-800"
      }`}
    >
      {/* 상단 탭 */}
      <Navbar isDarkMode={isDarkMode} />
      {/* 다크 모드 버튼 */}
      <DarkButton />
      {/* 검색 탭 */}
      <Searchbar isDarkMode={isDarkMode} value={query} onChange={setQuery} />

      {/* 메모 입력 폼 */}
      <div
        className={`${
          isDarkMode
            ? "bg-gray-800 text-white border-gray-600"
            : "bg-white text-gray-800 border-gray-300"
        } w-full max-w-4xl p-6 rounded-lg shadow-lg mb-8`}
      >
        <input
          type="text"
          placeholder="제목 입력"
          className={`${
            isDarkMode
              ? "bg-gray-800 text-white border-gray-600 hover:bg-gray-600"
              : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"
          } w-full p-2 mb-4 border rounded placeholder-gray-500`}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          placeholder="내용 입력"
          className={`${
            isDarkMode
              ? "bg-gray-800 text-white border-gray-600 hover:bg-gray-600"
              : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"
          } w-full p-2 h-32 border rounded resize-none placeholder-gray-500`}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
        />
        <input type="file" multiple onChange={handleFileChange} />
        {/* {file && <p>선택한 파일: {file.name}</p>} */}
        <div
          className={`flex items-center justify-between mt-4 ${
            isDarkMode ? "text-gray-300" : "text-gray-700"
          }`}
        >
          <label
            htmlFor="askAI"
            className="flex items-center space-x-2 cursor-pointer"
          >
            <div
              className={`w-10 h-6 rounded-full p-1 transition ${
                askAI
                  ? isDarkMode
                    ? "bg-indigo-600"
                    : "bg-indigo-500"
                  : isDarkMode
                  ? "bg-gray-700"
                  : "bg-gray-300"
              }`}
            >
              <div
                className={`w-4 h-4 bg-white rounded-full shadow-md transform transition ${
                  askAI ? "translate-x-4" : "translate-x-0"
                }`}
              ></div>
            </div>
            <span>{askAI ? "AI 요청 활성화됨" : "AI 요청 비활성화됨"}</span>
          </label>
          <input
            type="checkbox"
            id="askAI"
            className="hidden"
            checked={askAI}
            onChange={(e) => setAskAI(e.target.checked)}
          />
        </div>
        <button
          onClick={addMemo}
          className={`${
            isDarkMode
              ? "bg-indigo-700 text-white hover:bg-indigo-900"
              : "bg-indigo-600 text-white hover:bg-indigo-700"
          } mt-4 px-4 py-2 rounded  transition`}
        >
          추가하기
        </button>
      </div>

      {/* 메모 목록 */}
      <div className="w-full max-w-4xl">
        {filteredMemos.length === 0 ? (
          <p className="text-lg text-gray-500">저장된 메모가 없습니다.</p>
        ) : (
          filteredMemos.map((memo, index) => {
            const isExpanded = expandedMemoIds.includes(memo.seq); // 확장 여부 확인
            const isEditing = editMemoId === memo.seq; // 현재 메모가 수정 중인지 확인
          
            return (
              <div
                key={memo.seq}
                className={`${
                  isDarkMode
                    ? "bg-gray-800 text-white border-gray-600"
                    : "bg-white text-gray-800 border-gray-300"
                } p-4 rounded-lg shadow-lg mb-4 transition duration-300 flex items-center justify-between`}
              >
                <div className="flex-1 pr-4">
                  {isEditing ? (
                    <div>
                      {/* 제목 */}
                      <input
                        type="text"
                        value={editMemoContent.title}
                        onChange={(e) => {
                          setEditMemoContent((prev) => ({
                            ...prev,
                            title: e.target.value,
                          }));
                          e.target.style.height = "auto"; // 높이를 초기화
                          e.target.style.height = `${e.target.scrollHeight}px`; // 내용에 맞게 높이 조정
                        }}
                        className={`${
                          isDarkMode
                            ? "bg-gray-800 text-white border-gray-600 hover:bg-gray-600"
                            : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"
                        } w-full p-2 border rounded-md mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500`}
                        placeholder="제목"
                      />
                      {/* 주제 */}
                      <input
                        type="text"
                        value={editMemoContent.subject || ""}
                        onChange={(e) => {
                          setEditMemoContent((prev) => ({
                            ...prev,
                            subject: e.target.value,
                          }));
                          e.target.style.height = "auto"; // 높이를 초기화
                          e.target.style.height = `${e.target.scrollHeight}px`; // 내용에 맞게 높이 조정
                        }}
                        className={`${
                          isDarkMode
                            ? "bg-gray-800 text-white border-gray-600 hover:bg-gray-600"
                            : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"
                        } w-full p-2 border rounded-md mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500`}
                        placeholder="주제"
                      />
                      {/* 내용 */}
                      <textarea
                        value={editMemoContent.raw}
                        onChange={(e) => {
                          setEditMemoContent((prev) => ({
                            ...prev,
                            raw: e.target.value,
                          }));
                          e.target.style.height = "auto"; // 높이를 초기화
                          e.target.style.height = `${e.target.scrollHeight}px`; // 내용에 맞게 높이 조정
                        }}
                        className={`${
                          isDarkMode
                            ? "bg-gray-800 text-white border-gray-600 hover:bg-gray-600"
                            : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"
                        } w-full p-2 border rounded-md mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500`}
                        placeholder="내용"
                      />
                      {/* 응답 */}
                      <textarea
                        value={editMemoContent.answer || ""}
                        onChange={(e) => {
                          setEditMemoContent((prev) => ({
                            ...prev,
                            answer: e.target.value,
                          }));
                          e.target.style.height = "auto"; // 높이를 초기화
                          e.target.style.height = `${e.target.scrollHeight}px`; // 내용에 맞게 높이 조정
                        }}
                        className={`${
                          isDarkMode
                            ? "bg-gray-800 text-white border-gray-600 hover:bg-gray-600"
                            : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"
                        } h-48 w-full p-2 border rounded-md mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500`}
                        placeholder="응답"
                      />
                    </div>
                  ) : (
                    <div
                      className={`p-6 rounded-lg shadow-md ${
                        isDarkMode ? "bg-gray-900 text-white" : "bg-white text-gray-800"
                      }`}
                    >
                      <h4
                        className={`${
                          isDarkMode ? "text-white" : "text-gray-800"
                        } mb-3 text-xl font-semibold`}
                      >
                        {memo.title}
                      </h4>

                      {memo.subject && (
                        <p
                          className={`${
                            isDarkMode ? "text-indigo-300" : "text-indigo-500"
                          } text-sm mb-2 font-medium`}
                        >
                          주제: {memo.subject}
                        </p>
                      )}

                      <p
                        className={`${
                          isDarkMode ? "text-gray-300" : "text-gray-600"
                        } mb-3 leading-relaxed`}
                      >
                        {memo.raw.length > 200 && !isExpanded
                          ? `${memo.raw.substring(0, 200)}...`
                          : memo.raw}
                        {memo.raw.length > 200 && (
                          <button
                            onClick={() => toggleExpanded(memo.seq)}
                            className="text-sm text-blue-500 hover:underline ml-2"
                          >
                            {isExpanded ? "내용 접기" : "내용 더보기"}
                          </button>
                        )}
                      </p>

                      {memo.answer && (
                        <textarea
                          readOnly
                          ref={(el) => (textareaRefs.current[index] = el)}
                          className={`w-full mt-3 ${
                            isDarkMode
                              ? "bg-gray-800 text-white placeholder-gray-500"
                              : "bg-gray-100 text-gray-800 placeholder-gray-500"
                          } text-sm font-medium p-3 rounded-lg resize-none focus:outline-none`}
                          style={{ height: memoHeights[memo.seq] || "auto" }}
                          value={`조언 : ${memo.answer}`}
                        />
                      )}

                      {memo.files?.length > 0 && (
                        <div className="mt-5">
                          <h5
                            className={`${
                              isDarkMode ? "text-gray-300" : "text-gray-800"
                            } text-sm font-semibold mb-2`}
                          >
                            첨부 파일
                          </h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {memo.files.map(({ fileName }, index) => (
                              fileName && (
                                <button
                                  key={index}
                                  onClick={() => handleDownload(memo.seq, fileName)}
                                  className="flex items-center justify-between px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring focus:ring-blue-300"
                                >
                                  <span className="truncate">{fileName}</span>
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="w-4 h-4 ml-2"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M4 16l8 8m0 0l8-8m-8 8V4"
                                    />
                                  </svg>
                                </button>
                              )
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="mt-4 text-xs">
                        <p className="text-gray-400 dark:text-gray-500">
                          등록일시 : {new Date(memo.createdAt).toLocaleString()}
                        </p>
                        <p className="text-gray-400 dark:text-gray-500">
                          수정일시 : {new Date(memo.modifiedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center">
                  {isEditing ? (
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <button
                        onClick={() => saveMemo(memo.seq)}
                        className="w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center hover:bg-green-600 transition"
                        aria-label="저장"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => cancelMemo(memo.seq)}
                        className="w-10 h-10 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition"
                        aria-label="취소"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <button
                        onClick={() => startEditing(memo)}
                        className="w-10 h-10 bg-yellow-500 text-white rounded-full flex items-center justify-center hover:bg-yellow-600 transition"
                        aria-label="수정"
                      >
                        ✎
                      </button>
                      <button
                        onClick={() => deleteMemo(memo.seq)}
                        className="w-10 h-10 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition"
                        aria-label="삭제"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
