import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useDarkMode } from "../DarkModeContext";
import Navbar from "../components/Navbar";
import DarkButton from "../components/DarkButton";
import Searchbar from "../components/Searchbar";
import { MemoItem } from "../components/MemoItem"; // MemoItem 컴포넌트 import

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
  isSwiped: boolean;
}

export const MemoRouter = () => {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { isDarkMode } = useDarkMode();

  const [title, setTitle] = useState<string>("");
  const [askAI, setAskAI] = useState<boolean>(false);
  const [raw, setRaw] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const [memoHeights, setMemoHeights] = useState<Record<number, { raw: number; answer: number }>>({});
  const textareaRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map());
  const [files, setFiles] = useState<File[] | null>(null);
  const [query, setQuery] = useState("");
  const [isSwiped, setIsSwiped] = useState(false);
  const [isScreenNarrow, setIsScreenNarrow] = useState(window.innerWidth <= 768); // 초기화 (768px 이하에서 스와이프 가능)

  useEffect(() => {
    const newMemoHeights: Record<number, { raw: number; answer: number }> = {};
    memos.forEach((memo, index) => {
      const rawTextarea = textareaRefs.current.get(`raw_${memo.seq}`);
      const answerTextarea = textareaRefs.current.get(`answer_${memo.seq}`);
      newMemoHeights[memo.seq] = {
        raw: rawTextarea?.scrollHeight || 0,
        answer: answerTextarea?.scrollHeight || 0,
      };
    });
    setMemoHeights(newMemoHeights);
  }, [memos, editMemoContent]);
  
  // 화면 크기 감지
  useEffect(() => {
    const handleResize = () => {
      const isNarrow = window.innerWidth <= 768;
      setIsScreenNarrow(isNarrow);

      // 넓은 화면일 경우 항상 스와이프 활성화
      if (!isNarrow) {
        setIsSwiped(true);
      }
    };

    // 초기 실행 및 이벤트 리스너 등록
    handleResize();
    window.addEventListener("resize", handleResize);

    // 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  
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
  // MemoRouter 내에서
const handleUpdateEditMemoContent = (
  newContent: Partial<{ title: string; subject?: string; raw: string; answer: string }>
) => {
  setEditMemoContent((prev) => ({
    ...prev,
    ...newContent,
  }));
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
          { withCredentials: true, headers: { "X-API-Request": "true" }}
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
    const fetchMemos = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get(`/memo/list`, {
          withCredentials: true, headers: { "X-API-Request": "true" }
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
  }, []);

  const [expandedMemoIds, setExpandedMemoIds] = useState<Number[]>([]); // 확장된 메모의 ID 저장

  const toggleExpanded = (seq: number) => {
    setExpandedMemoIds(
      (prev) =>
        prev.includes(seq)
          ? prev.filter((id) => id !== seq) // 이미 확장된 상태면 제거
          : [...prev, seq] // 확장되지 않은 상태면 추가
    );
  };

  // 분석 API 호출 함수
  const handleAnalyze = (memoSeq: number) => {
    try {
      if (!window.confirm("해당 메모의 사진을 분석하시겠습니까?")) {
        return;
      }

      axios.post(`/memo/analyze?seq=${memoSeq}`,
        JSON.stringify({ seq: memoSeq }), // 메모 seq 전달 
        { withCredentials: true, headers: { "Content-Type": "application/json", "X-API-Request": "true"}}
      );

    } catch (error) {}
  };

  const addMemo = async () => {
    if (!title || !raw) {
      alert("제목과 내용을 모두 입력해주세요.");
      return;
    }

    let [answer, subject]: [string, string] = ["", ""];

    if(askAI) {
      try {
        // AI 요청
        let formData = new FormData();
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
          isSwiped,
        };
    
        if(files) {
          for(let file of files) {
            formData.append("files", file);
          }
          // 파일 입력 초기화
          if (fileInputRef.current) {
            fileInputRef.current.value = ""; // 파일 입력 필드 리셋
          }
          setFiles(null);
        }
        // 추가로 req.body의 키/값을 FormData에 추가
        for (const [key, value] of Object.entries(newMemo)) {
          formData.append(key, value);
        }
    
        const aiAnswers = (await axios.post(`/memo/get-advice`
          , formData
          , { withCredentials: true
            , headers: { "content-type": "multipart/form-data", "X-API-Request": "true" }
            , maxContentLength: 1024 ** 3 // 1GB로 설정
            , maxBodyLength: 1024 ** 3 // 1GB로 설정
        })).data;

        subject = aiAnswers.subject;
        answer = aiAnswers.advice;
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
      isSwiped,
    };

    try {
      let formData = new FormData();
      if(files) {
        for(let file of files) {
          formData.append("files", file);
        }
        // 파일 입력 초기화
        if (fileInputRef.current) {
          fileInputRef.current.value = ""; // 파일 입력 필드 리셋
        }
        setFiles(null);
      }
      // 추가로 req.body의 키/값을 FormData에 추가
      for (const [key, value] of Object.entries(newMemo)) {
        formData.append(key, value);
      }
  
      const response = await axios.post(`/memo/insert`
        , formData
        , { withCredentials: true
          , headers: { "content-type": "multipart/form-data", "X-API-Request": "true" }
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
          withCredentials: true, headers: { "X-API-Request": "true"}
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
      if(window.confirm(`다운로드 받으시겠습니까? (${fileName})`)) {
        const response = await axios.get(`/file/download`, {
          params: { fileFrom: 'MEMO', seq: memoSeq, fileName }, // 해당 파라미터로 요청
          responseType: 'blob',  // 파일 다운로드를 위해 blob으로 설정
          headers: {
            'Cache-Control': 'no-cache', // 캐시를 사용하지 않도록 설정
            'If-Modified-Since': '0', // If-Modified-Since 무력화
            'If-None-Match': '', // If-None-Match 무력화
            Accept: 'application/octet-stream', // 명시적으로 blob 타입 요청
            "X-API-Request": "true"
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
        URL.revokeObjectURL(downloadUrl); // 메모리 정리  
      }
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
        {/* 검색 탭 */}
        <Searchbar isDarkMode={isDarkMode} value={query} onChange={setQuery} />
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
        <input type="file" multiple ref={fileInputRef} onChange={handleFileChange} />
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
            const isEditing = editMemoId === memo.seq;
            const isExpanded = expandedMemoIds.includes(memo.seq);
            return (
              <MemoItem
              key={memo.seq}
              memo={memo}
              isScreenNarrow={isScreenNarrow}
              isDarkMode={isDarkMode}
              isEditing={isEditing}
              isExpanded={isExpanded}
              memoHeights={memoHeights[memo.seq]}
              index={index}
              startEditing={startEditing}
              cancelMemo={cancelMemo}
              saveMemo={saveMemo}
              deleteMemo={deleteMemo}
              toggleExpanded={toggleExpanded}
              textareaRefs={textareaRefs}
              editMemoContent={isEditing ? editMemoContent : undefined}
              updateEditMemoContent={isEditing ? handleUpdateEditMemoContent : undefined}
              handleDownload={handleDownload}
              handleAnalyze={handleAnalyze}
            />
            );
          })
        )}
      </div>
    </div>
  );
};
