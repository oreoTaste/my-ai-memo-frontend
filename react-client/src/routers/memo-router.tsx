import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useDarkMode } from "../contexts/DarkModeContext";
import Navbar from "../components/Navbar";
import DarkButton from "../components/DarkButton";
import Searchbar from "../components/Searchbar";
import { MemoItem } from "../components/MemoItem";
import { MemoUser, Memo } from "../types/memo";
import { useUser } from "../contexts/UserContext";

export const MemoRouter = () => {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { isDarkMode } = useDarkMode();
  const { user: storedUser } = useUser();

  // 메모 추가 상태
  const [title, setTitle] = useState<string>("");
  const [askAI, setAskAI] = useState<boolean>(false);
  const [raws, setRaws] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[] | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // 사용자 검색 및 선택 상태 (신규 메모 입력용)
  const [searchName, setSearchName] = useState<string>("");
  const [searchLoginId, setSearchLoginId] = useState<string>("");
  const [searchUserResults, setSearchUserResults] = useState<MemoUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<MemoUser[]>([]); // shareType 포함

  // 수정 상태
  const [editMemoId, setEditMemoId] = useState<number | null>(null);
  const [editMemoContent, setEditMemoContent] = useState<{
    title: string;
    subject?: string;
    raws: string;
    answer: string;
    sharedUsers: MemoUser[];
  }>({
    title: "",
    subject: "",
    raws: "",
    answer: "",
    sharedUsers: [],
  });

  // UI 관련 상태
  const [memoHeights, setMemoHeights] = useState<Record<number, { raws: number; answer: number }>>({});
  const textareaRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map());
  const [query, setQuery] = useState("");
  const [isScreenNarrow, setIsScreenNarrow] = useState(window.innerWidth <= 768);
  const [expandedMemoIds, setExpandedMemoIds] = useState<number[]>([]);

  // 메모 높이 계산
  useEffect(() => {
    const newMemoHeights: Record<number, { raws: number; answer: number }> = {};
    memos.forEach((memo) => {
      const rawsTextarea = textareaRefs.current.get(`raws_${memo.seq}`);
      const answerTextarea = textareaRefs.current.get(`answer_${memo.seq}`);
      newMemoHeights[memo.seq] = {
        raws: rawsTextarea?.scrollHeight || 0,
        answer: answerTextarea?.scrollHeight || 0,
      };
    });
    setMemoHeights(newMemoHeights);
  }, [memos]);

  // 화면 크기 감지
  useEffect(() => {
    const handleResize = () => {
      const isNarrow = window.innerWidth <= 768;
      setIsScreenNarrow(isNarrow);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 메모 목록 가져오기
  useEffect(() => {
    const fetchMemos = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get(`/memo/list`, {
          withCredentials: true,
          headers: { "X-API-Request": "true" },
        });
        if (response.data.result) {
          const sortedMemos = response.data.memos.sort((a: Memo, b: Memo) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
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

  // 사용자 검색 (신규 메모 입력용)
  const searchUsers = async () => {
    if (!searchName.trim() || !searchLoginId.trim()) {
      setSearchUserResults([]);
      return;
    }
    try {
      const response = await axios.get(`/user/search`, {
        params: { name: searchName, loginId: searchLoginId },
        withCredentials: true,
        headers: { "X-API-Request": "true" },
      });
      if (response.data.result) {
        setSearchUserResults(response.data.users || []);
      } else {
        setSearchUserResults([]);
      }
    } catch (error) {
      console.error("사용자 검색 중 오류 발생:", error);
      setSearchUserResults([]);
    }
  };

  // 사용자 선택 토글 (신규 메모 입력용) - 수정됨: shareType 추가
  const toggleUserSelection = (user: MemoUser, shareType: 'view' | 'edit') => {
    setSelectedUsers((prev) => {
      const exists = prev.find((u) => u.id === user.id);
      if (exists) {
        return prev.map((u) => (u.id === user.id ? { ...u, shareType } : u));
      } else {
        return [...prev, { ...user, shareType }];
      }
    });
    setSearchName("");
    setSearchLoginId("");
    setSearchUserResults([]);
  };

  // 수정 시작
  const startEditing = (memo: Memo) => {
    setEditMemoId(memo.seq);
    setEditMemoContent({
      title: memo.title,
      subject: memo.subject || "",
      raws: memo.raws,
      answer: memo.answer,
      sharedUsers: memo.sharedUsers || [],
    });
  };

  // 수정 저장
  const updateMemo = async (memoId: number, updatedContent: Partial<Memo>) => {
    const prevMemo = memos.find((el) => el.seq === memoId);
    if (
      prevMemo?.answer === updatedContent.answer &&
      prevMemo?.raws === updatedContent.raws &&
      prevMemo?.subject === updatedContent.subject &&
      prevMemo?.title === updatedContent.title &&
      JSON.stringify(prevMemo?.sharedUsers?.map((u) => ({ id: u.id, shareType: u.shareType }))) ===
        JSON.stringify(updatedContent.sharedUsers?.map((u) => ({ id: u.id, shareType: u.shareType })))
    ) {
      cancelMemo(memoId);
      return;
    }
    let updateMemo = {
      seq: memoId,
      subject: updatedContent.subject,
      answer: updatedContent.answer,
      title: updatedContent.title,
      raws: updatedContent.raws,
      sharedInfosJson: JSON.stringify(updatedContent.sharedUsers?.map((u) => ({ id: u.id, shareType: u.shareType }))),
    };
    try {
      const response = await axios.post(
        `/memo/update`, updateMemo,
        { withCredentials: true, headers: { "X-API-Request": "true" } }
      );
      if (response.data.result) {
        const updatedMemos = memos.map((memo) =>
          memo.seq === memoId ? response.data.memos[0] : memo
        );
        setMemos(updatedMemos);
        cancelMemo(memoId);
      } else {
        alert("메모 수정 중 오류가 발생했습니다.");
      }
    } catch (error) {
      console.error("메모 수정 실패:", error);
      alert("메모 수정 중 오류가 발생했습니다.");
    }
  };

  // 수정 취소
  const cancelMemo = (memoId: number) => {
    setEditMemoId(null);
    setEditMemoContent({ title: "", subject: "", raws: "", answer: "", sharedUsers: [] });
  };

  // 메모 추가 - 수정됨: shareType 포함
  const addMemo = async () => {
    if (!title || !raws) {
      alert("제목과 내용을 모두 입력해주세요.");
      return;
    }
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      let [answer, subject]: [string, string] = ["", ""];
      if (askAI) {
        const formData = new FormData();
        const newMemo = { raws, title, subject, answer };
        if (files) {
          for (let file of files) formData.append("files", file);
        }
        for (const [key, value] of Object.entries(newMemo)) {
          formData.append(key, value ?? "");
        }
        const aiAnswers = (
          await axios.post(`/memo/get-advice`, formData, {
            withCredentials: true,
            headers: { "content-type": "multipart/form-data", "X-API-Request": "true" },
            maxContentLength: 1024 ** 3,
            maxBodyLength: 1024 ** 3,
          })
        ).data;
        subject = aiAnswers.subject;
        answer = aiAnswers.advice;
      }

      const newMemo: Memo = {
        raws,
        title,
        subject,
        answer,
        seq: 0,
        insertId: 0,
        createdAt: "",
        modifiedAt: "",
        files: [],
        isSwiped: false,
        googleDriveFileId: "",
        sharedUsers: selectedUsers, // shareType 포함
        insertUser: undefined,
      };

      const formData = new FormData();
      if (files) {
        for (let file of files) formData.append("files", file);
        if (fileInputRef.current) fileInputRef.current.value = "";
        setFiles(null);
      }
      for (const [key, value] of Object.entries(newMemo)) {
        if (key === "sharedUsers") {
          formData.append("sharedInfosJson", JSON.stringify(value.map((user: MemoUser) => ({ id: user.id, shareType: user.shareType }))));
        } else {
          formData.append(key, value ?? "");
        }
      }
      const response = await axios.post(`/memo/insert`, formData, {
        withCredentials: true,
        headers: { "content-type": "multipart/form-data", "X-API-Request": "true" },
        maxContentLength: 1024 ** 3,
        maxBodyLength: 1024 ** 3,
      });
      if (response.data.result) {
        setMemos((prev) => [response.data.memos[0], ...prev]);
        setTitle("");
        setRaws("");
        setAskAI(false);
        setSelectedUsers([]);
        setSearchName("");
        setSearchLoginId("");
        setSearchUserResults([]);
        alert("메모가 성공적으로 추가되었습니다.");
      } else {
        alert("메모 추가에 실패했습니다.");
      }
    } catch (err) {
      console.error("메모 추가 중 오류 발생:", err);
      alert("메모 추가 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 메모 삭제
  const deleteMemo = async (seq: number) => {
    const memoToDelete = memos.find((el) => el.seq === seq);
    
    if (!memoToDelete) {
      alert('선택한 메모를 찾을 수 없습니다. 다시 시도해 주세요.');
      return;
    }
  
    const userName = memoToDelete.insertUser?.name || '알 수 없는 사용자';
    const isOwnMemo = memoToDelete.insertUser?.id === storedUser?.id;
    const confirmMessage = isOwnMemo
      ? `메모 [${memoToDelete.title}]을(를) 정말로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`
      : `${userName}님이 공유한 메모 [${memoToDelete.title}]의 공유를 취소하시겠습니까?`;
  
    if (!window.confirm(confirmMessage)) {
      return;
    }
  
    try {
      const response = await axios.delete(isOwnMemo ? `/memo/delete?seq=${seq}` : `/memo/shared-delete?seq=${seq}`, {
        withCredentials: true,
        headers: { "X-API-Request": "true" },
      });
  
      if (response.data.result) {
        setMemos((prev) => prev.filter((memo) => memo.seq !== seq));
        alert(isOwnMemo 
          ? '메모가 성공적으로 삭제되었습니다.' 
          : '메모 공유가 성공적으로 취소되었습니다.');
      } else {
        alert('메모 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      }
    } catch (err) {
      console.error("메모 처리 중 오류 발생:", err);
      alert('메모 처리 중 오류가 발생했습니다. 문제가 지속되면 지원팀에 문의해 주세요.');
    }
  };

  // 파일 다운로드
  const handleDownload = async (memoSeq: number, fileName: string, googleDriveFileId?: string) => {
    if (!window.confirm(`다운로드 받으시겠습니까? (${fileName})`)) return;
    try {
      const response = await axios.get('/file/download', {
        params: { fileFrom: 'MEMO', seq: memoSeq, googleDriveFileId },
        responseType: 'blob',
        headers: { "X-API-Request": "true" },
        withCredentials: true,
      });
      const downloadUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      if (!googleDriveFileId) window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Download error:', error);
      alert('파일 다운로드에 실패했습니다.');
    }
  };

  // 메모 분석
  const handleAnalyze = async (memoSeq: number) => {
    if (!window.confirm("해당 메모의 파일을 분석하시겠습니까?\n분석된 파일은 엑셀파일로 생성됩니다.\n(파일명: output.xlsx)\n\n**1분후 화면을 새로고침해주세요.**")) return;
    try {
      await axios.post(`/memo/analyze?seq=${memoSeq}`, { seq: memoSeq }, {
        withCredentials: true,
        headers: { "Content-Type": "application/json", "X-API-Request": "true" },
      });
    } catch (error) {
      console.error("분석 중 오류 발생:", error);
    }
  };

  const toggleExpanded = (memoSeq: number) => {
    setExpandedMemoIds((prev) =>
      prev.includes(memoSeq) ? prev.filter((id) => id !== memoSeq) : [...prev, memoSeq]
    );
  };

  const filteredMemos = memos.filter((item) =>
    [item.title, item.raws, item.subject, item.answer]
      .some((field) => field?.toLowerCase().includes(query.toLowerCase())) ||
    item.files?.some((file) => file.fileName.toLowerCase().includes(query.toLowerCase()))
  );

  if (isLoading) {
    return (
      <div className={`flex flex-col items-center pt-16 min-h-screen ${isDarkMode ? "bg-gray-900 text-white" : "bg-gray-200 text-gray-800"}`}>
        <Navbar isDarkMode={isDarkMode} />
        <DarkButton />
        <Searchbar isDarkMode={isDarkMode} value={query} onChange={setQuery} />
        <div className="text-center py-4">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center pt-16 min-h-screen ${isDarkMode ? "bg-gray-900 text-white" : "bg-gray-200 text-gray-800"}`}>
      <Navbar isDarkMode={isDarkMode} />
      <DarkButton />
      <Searchbar isDarkMode={isDarkMode} value={query} onChange={setQuery} />

      {/* 메모 입력 폼 */}
      <div className={`${isDarkMode ? "bg-gray-800 text-white border-gray-600" : "bg-white text-gray-800 border-gray-300"} w-full max-w-4xl p-6 rounded-lg shadow-lg mb-8`}>
        {/* 기본 입력 필드 */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="제목 입력"
            className={`${isDarkMode ? "bg-gray-800 text-white border-gray-600 hover:bg-gray-600" : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"} w-full p-2 mb-4 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-500`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            placeholder="내용 입력"
            className={`${isDarkMode ? "bg-gray-800 text-white border-gray-600 hover:bg-gray-600" : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"} w-full p-2 h-32 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-500`}
            value={raws}
            onChange={(e) => setRaws(e.target.value)}
          />
          <input
            type="file"
            multiple
            ref={fileInputRef}
            onChange={(e) => setFiles(e.target.files ? Array.from(e.target.files) : null)}
            className="mt-4"
          />
        </div>

        {/* 공유 사용자 섹션 - 수정됨: shareType 선택 UI 추가 */}
        <div className={`p-4 rounded-md ${isDarkMode ? "bg-gray-700" : "bg-gray-100"} mb-6`}>
          <h3 className={`text-lg font-semibold mb-3 ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}>
            공유 사용자 추가
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="이름"
              className={`${isDarkMode ? "bg-gray-800 text-white border-gray-600 hover:bg-gray-700" : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"} w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-500`}
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
            />
            <input
              type="text"
              placeholder="로그인 ID"
              className={`${isDarkMode ? "bg-gray-800 text-white border-gray-600 hover:bg-gray-700" : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"} w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-500`}
              value={searchLoginId}
              onChange={(e) => setSearchLoginId(e.target.value)}
            />
          </div>
          <button
            onClick={searchUsers}
            className={`${isDarkMode ? "bg-indigo-700 hover:bg-indigo-800" : "bg-indigo-600 hover:bg-indigo-700"} mt-2 w-full py-2 rounded-md text-white font-medium transition-all duration-200`}
          >
            사용자 검색
          </button>
          {searchUserResults.length > 0 && (
            <div
              className={`relative mt-2 w-full max-h-[50vh] overflow-y-auto rounded-md shadow-lg transition-all duration-200 ${isDarkMode ? "bg-gray-700 text-white" : "bg-white text-gray-800"}`}
              style={{ maxHeight: "50vh", top: "100%" }}
            >
              {searchUserResults.map((user) => (
                <div key={user.id} className="p-3 flex justify-between items-center">
                  <span>
                    {user.name} ({user.loginId})
                  </span>
                  <div className="flex items-center space-x-2">
                    <label>
                      <input
                        type="radio"
                        name={`shareType_${user.id}`}
                        value="view"
                        onChange={() => toggleUserSelection(user, 'view')}
                        checked={selectedUsers.some((u) => u.id === user.id && u.shareType === 'view')}
                      />
                      조회
                    </label>
                    <label>
                      <input
                        type="radio"
                        name={`shareType_${user.id}`}
                        value="edit"
                        onChange={() => toggleUserSelection(user, 'edit')}
                        checked={selectedUsers.some((u) => u.id === user.id && u.shareType === 'edit')}
                      />
                      수정
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}
          {selectedUsers.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedUsers.map((user) => (
                <div
                  key={user.id}
                  className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-medium transition-all duration-200 ${
                    isDarkMode ? "bg-indigo-700 text-white" : "bg-indigo-100 text-indigo-800"
                  }`}
                >
                  {user.name} ({user.loginId}) - {user.shareType}
                  <button
                    onClick={() => setSelectedUsers((prev) => prev.filter((u) => u.id !== user.id))}
                    className="ml-2 focus:outline-none"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-4 h-4 text-red-500 hover:text-red-700"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI 요청 및 추가 버튼 */}
        <div className={`flex items-center justify-between ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
          <label htmlFor="askAI" className="flex items-center space-x-2 cursor-pointer">
            <div className={`w-10 h-6 rounded-full p-1 transition ${askAI ? (isDarkMode ? "bg-indigo-600" : "bg-indigo-500") : isDarkMode ? "bg-gray-700" : "bg-gray-300"}`}>
              <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition ${askAI ? "translate-x-4" : "translate-x-0"}`}></div>
            </div>
            <span>{askAI ? "AI 요청 활성화됨" : "AI 요청 비활성화됨"}</span>
          </label>
          <input type="checkbox" id="askAI" className="hidden" checked={askAI} onChange={(e) => setAskAI(e.target.checked)} />
        </div>
        <button
          onClick={addMemo}
          disabled={isSubmitting}
          className={`${isDarkMode ? "bg-indigo-700 text-white hover:bg-indigo-900" : "bg-indigo-600 text-white hover:bg-indigo-700"} mt-4 px-4 py-2 rounded-md transition`}
        >
          {isSubmitting ? "추가 중..." : "추가하기"}
        </button>
      </div>
      {/* 메모 목록 */}
      <div className="w-full max-w-4xl">
        {filteredMemos.length === 0 ? (
          <p className="text-lg text-gray-500">저장된 메모가 없습니다.</p>
        ) : (
          filteredMemos.map((memo, index) => (
            <MemoItem
              key={memo.seq}
              memo={memo}
              isDarkMode={isDarkMode}
              isEditing={editMemoId === memo.seq}
              isExpanded={expandedMemoIds.includes(memo.seq)}
              memoHeights={memoHeights[memo.seq]}
              index={index}
              isScreenNarrow={isScreenNarrow}
              startEditing={startEditing}
              cancelMemo={cancelMemo}
              updateMemo={updateMemo}
              deleteMemo={deleteMemo}
              toggleExpanded={toggleExpanded}
              textareaRefs={textareaRefs}
              editMemoContent={editMemoId === memo.seq ? editMemoContent : undefined}
              handleDownload={handleDownload}
              handleAnalyze={handleAnalyze}
            />
          ))
        )}
      </div>
    </div>
  );
};