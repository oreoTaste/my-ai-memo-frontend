import React, { useState, useEffect } from "react";
import { useSwipeable } from "react-swipeable";
import { useUser } from "../contexts/UserContext";
import axios from "axios";
import { MemoUser, Memo } from "../types/memo";

interface MemoItemProps {
  memo: Memo;
  isDarkMode: boolean;
  isEditing: boolean;
  isExpanded: boolean;
  memoHeights?: { raws: number; answer: number };
  index: number;
  isScreenNarrow: boolean;
  startEditing: (memo: Memo) => void;
  cancelMemo: (memoSeq: number) => void;
  saveMemo: (memoSeq: number) => void;
  deleteMemo: (memoSeq: number) => void;
  toggleExpanded: (memoSeq: number) => void;
  textareaRefs: React.MutableRefObject<Map<string, HTMLTextAreaElement>>;
  editMemoContent?: {
    title: string;
    subject?: string;
    raws: string;
    answer: string;
    sharedIds?: number[];
  };
  updateEditMemoContent?: (
    newContent: Partial<{
      title: string;
      subject?: string;
      raws: string;
      answer: string;
      sharedIds?: number[];
    }>
  ) => void;
  handleDownload: (memoSeq: number, fileName: string, googleDriveFileId?: string) => void;
  handleAnalyze: (memoSeq: number) => void;
}

export const MemoItem: React.FC<MemoItemProps> = ({
  memo,
  isDarkMode,
  isEditing,
  isExpanded,
  memoHeights,
  index,
  startEditing,
  cancelMemo,
  saveMemo,
  deleteMemo,
  toggleExpanded,
  textareaRefs,
  editMemoContent,
  updateEditMemoContent,
  isScreenNarrow,
  handleDownload,
  handleAnalyze,
}) => {
  const [isSwiped, setIsSwiped] = useState(false);
  const { user: storedUser } = useUser();
  const [searchName, setSearchName] = useState<string>("");
  const [searchLoginId, setSearchLoginId] = useState<string>("");
  const [searchUserResults, setSearchUserResults] = useState<MemoUser[]>([]);
  const [existingSharedUsers, setExistingSharedUsers] = useState<MemoUser[]>(memo.sharedUsers || []);

  // 수정 모드 진입 시 초기화는 한 번만 실행
  useEffect(() => {
    if (isEditing && memo.sharedUsers && existingSharedUsers.length === 0) {
      setExistingSharedUsers(memo.sharedUsers);
      if (updateEditMemoContent && editMemoContent?.sharedIds === undefined) {
        updateEditMemoContent({
          sharedIds: memo.sharedUsers.map((user) => user.id),
        });
      }
    }
  }, [isEditing, memo.sharedUsers, updateEditMemoContent, existingSharedUsers.length, editMemoContent?.sharedIds]);/*react-hooks/exhaustive-deps*/

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

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => isScreenNarrow && setIsSwiped(true),
    onSwipedRight: () => isScreenNarrow && setIsSwiped(false),
    preventScrollOnSwipe: true,
    trackTouch: true,
    trackMouse: true,
    delta: 50,
  });

  const imageRegExp = /\.(jpeg|jpg|png|jfif|gif|webp)$/i;
  const analyzableRegExp = /\.(jpeg|jpg|png|jfif|gif|webp|pdf)$/i;

  const isAnalyzableFile = (): boolean => {
    return !!memo.files && memo.files.some(({ fileName }) => analyzableRegExp.test(fileName));
  };

  const toggleUserSelection = (userId: number) => {
    if (!updateEditMemoContent) return;
    const currentSharedIds = editMemoContent?.sharedIds || [];
    console.log("Before toggle:", currentSharedIds, "userId:", userId);

    if (currentSharedIds.includes(userId)) {
      const newSharedIds = currentSharedIds.filter((id) => id !== userId);
      updateEditMemoContent({ sharedIds: newSharedIds });
      setExistingSharedUsers((prev) => prev.filter((user) => user.id !== userId));
      console.log("After removal:", newSharedIds);
    } else {
      const newSharedIds = [...currentSharedIds, userId];
      const selectedUser =
        searchUserResults.find((user) => user.id === userId) ||
        memo.sharedUsers?.find((user) => user.id === userId);
      if (selectedUser && !existingSharedUsers.some((user) => user.id === userId)) {
        setExistingSharedUsers((prev) => [...prev, selectedUser]);
      }
      updateEditMemoContent({ sharedIds: newSharedIds });
      console.log("After addition:", newSharedIds);
    }
  };

  const selectedUsers = (editMemoContent?.sharedIds || [])
    .map((id) => {
      const user =
        existingSharedUsers.find((user) => user.id === id) ||
        memo.sharedUsers?.find((user) => user.id === id) ||
        searchUserResults.find((user) => user.id === id);
      return user;
    })
    .filter((user): user is MemoUser => !!user);

  useEffect(() => {
    console.log("Selected users updated:", selectedUsers);
    console.log("existingSharedUsers:", existingSharedUsers);
  }, [editMemoContent?.sharedIds, existingSharedUsers, selectedUsers]);

  return (
    <div
      {...swipeHandlers}
      className={`relative overflow-hidden rounded-lg shadow-lg p-4 mb-4 transition duration-300 flex items-center justify-between ${
        isDarkMode
          ? "bg-gray-800 text-white border-gray-600"
          : "bg-white text-gray-800 border-gray-300"
      } ${isSwiped ? "translate-x-[-100px]" : "translate-x-0"}`}
    >
      <div className="flex-1 pr-4">
        {isEditing ? (
          <div>
            {/* 제목 입력 */}
            <input
              type="text"
              value={editMemoContent?.title || ""}
              onChange={(e) => updateEditMemoContent?.({ title: e.target.value })}
              className={`w-full p-2 border rounded-md mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500 ${
                isDarkMode
                  ? "bg-gray-800 text-white border-gray-600 hover:bg-gray-600"
                  : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"
              }`}
              placeholder="제목"
              style={{ height: "auto" }}
            />
            {/* 주제 입력 */}
            <input
              type="text"
              value={editMemoContent?.subject || ""}
              onChange={(e) => updateEditMemoContent?.({ subject: e.target.value })}
              className={`w-full p-2 border rounded-md mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500 ${
                isDarkMode
                  ? "bg-gray-800 text-white border-gray-600 hover:bg-gray-600"
                  : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"
              }`}
              placeholder="주제"
              style={{ height: "auto" }}
            />
            {/* 공유 사용자 추가 UI */}
            <div className="mb-4 relative">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="이름"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-500 ${
                    isDarkMode
                      ? "bg-gray-800 text-white border-gray-600 hover:bg-gray-700"
                      : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"
                  }`}
                />
                <input
                  type="text"
                  placeholder="로그인 ID"
                  value={searchLoginId}
                  onChange={(e) => setSearchLoginId(e.target.value)}
                  className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-500 ${
                    isDarkMode
                      ? "bg-gray-800 text-white border-gray-600 hover:bg-gray-700"
                      : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"
                  }`}
                />
              </div>
              <button
                onClick={searchUsers}
                className={`mt-2 w-full py-2 rounded-md text-white font-medium transition-all duration-200 ${
                  isDarkMode
                    ? "bg-indigo-700 hover:bg-indigo-800"
                    : "bg-indigo-600 hover:bg-indigo-700"
                }`}
              >
                사용자 검색
              </button>
              {searchUserResults.length > 0 && (
                <div
                  className={`absolute z-10 mt-2 w-full max-h-48 overflow-y-auto rounded-md shadow-lg transition-all duration-200 ${
                    isDarkMode ? "bg-gray-700 text-white" : "bg-white text-gray-800"
                  }`}
                >
                  {searchUserResults.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => {
                        toggleUserSelection(user.id);
                        setSearchName("");
                        setSearchLoginId("");
                        setSearchUserResults([]);
                      }}
                      className={`p-3 flex justify-between items-center cursor-pointer hover:${
                        isDarkMode ? "bg-gray-600" : "bg-gray-100"
                      } ${
                        editMemoContent?.sharedIds?.includes(user.id)
                          ? isDarkMode
                            ? "bg-indigo-600 text-white"
                            : "bg-indigo-100 text-indigo-800"
                          : ""
                      }`}
                    >
                      <span>{user.name} ({user.loginId})</span>
                      {editMemoContent?.sharedIds?.includes(user.id) && (
                        <span className="text-sm text-indigo-500">✓</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {selectedUsers.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedUsers.map((user) => (
                    <div
                      key={user.id}
                      className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-medium transition-all duration-200 ${
                        isDarkMode
                          ? "bg-indigo-700 text-white"
                          : "bg-indigo-100 text-indigo-800"
                      }`}
                    >
                      {user.name} ({user.loginId})
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleUserSelection(user.id);
                        }}
                        className="ml-2 focus:outline-none"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-4 h-4 text-red-500 hover:text-red-700"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* 내용 입력 */}
            <textarea
              value={editMemoContent?.raws || ""}
              onChange={(e) => {
                updateEditMemoContent?.({ raws: e.target.value });
                e.target.style.height = "auto";
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              className={`w-full p-2 border rounded-md mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500 ${
                isDarkMode
                  ? "bg-gray-800 text-white border-gray-600 hover:bg-gray-600"
                  : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"
              }`}
              placeholder="내용"
              style={{ height: "auto" }}
            />
            <textarea
              value={editMemoContent?.answer || ""}
              onChange={(e) => {
                updateEditMemoContent?.({ answer: e.target.value });
                e.target.style.height = "auto";
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              className={`h-48 w-full p-2 border rounded-md mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500 ${
                isDarkMode
                  ? "bg-gray-800 text-white border-gray-600 hover:bg-gray-600"
                  : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"
              }`}
              placeholder="응답"
              style={{ height: "auto" }}
            />
          </div>
        ) : (
          <div
            className={`p-6 rounded-lg shadow-md ${
              isDarkMode ? "bg-gray-900 text-white" : "bg-white text-gray-800"
            }`}
          >
            <h4
              className={`mb-3 text-xl font-semibold ${
                isDarkMode ? "text-white" : "text-gray-800"
              }`}
            >
              [{memo.title}]
              {memo.insertId !== storedUser?.id
                ? ` (shared by ${memo?.insertUser?.loginId})`
                : memo.sharedUsers?.length
                ? ` (shared to ${memo.sharedUsers.map((el) => el.loginId).join(",")})`
                : null}
            </h4>
            {memo.subject && (
              <p
                className={`mb-2 text-sm font-medium ${
                  isDarkMode ? "text-indigo-300" : "text-indigo-500"
                }`}
              >
                주제: {memo.subject}
              </p>
            )}
            <textarea
              readOnly
              ref={(el) => el && textareaRefs.current.set(`raws_${memo.seq}`, el)}
              className={`w-full mt-3 ${
                isDarkMode
                  ? "bg-gray-800 text-white placeholder-gray-500"
                  : "bg-gray-100 text-gray-800 placeholder-gray-500"
              } text-sm font-medium p-3 rounded-lg resize-none focus:outline-none`}
              style={{ height: memoHeights?.raws || "auto" }}
              value={`${memo.raws}`}
            />
            {memo.answer && (
              <textarea
                readOnly
                ref={(el) => el && textareaRefs.current.set(`answer_${memo.seq}`, el)}
                className={`w-full mt-3 ${
                  isDarkMode
                    ? "bg-gray-800 text-white placeholder-gray-500"
                    : "bg-gray-100 text-gray-800 placeholder-gray-500"
                } text-sm font-medium p-3 rounded-lg resize-none focus:outline-none`}
              style={{ height: memoHeights?.answer || "auto" }}
                value={`조언 : ${memo.answer}`}
              />
            )}
            {memo.files && memo.files.length > 0 && (
              <div className="mt-5">
                <h5
                  className={`text-sm font-semibold mb-2 ${
                    isDarkMode ? "text-gray-300" : "text-gray-800"
                  }`}
                >
                  첨부 파일
                </h5>
                <div className="flex flex-wrap gap-4 mb-4">
                  {memo.files
                    .filter(({ fileName }) => imageRegExp.test(fileName))
                    .map(({ fileName, googleDriveFileId }, idx) => {
                      const imageSrc = googleDriveFileId
                        ? `https://drive.google.com/thumbnail?id=${googleDriveFileId}&sz=w144-h144`
                        : `/uploads/${memo.seq}/${fileName}`;
                      const imageLink = googleDriveFileId
                        ? `https://drive.google.com/file/d/${googleDriveFileId}/view?usp=drive_link`
                        : `/uploads/${memo.seq}/${fileName}`;
                      return (
                        <img
                          key={idx}
                          onClick={() => window.open(imageLink, "_blank")}
                          className="max-h-36 max-w-36 cursor-pointer rounded-lg border border-gray-300 hover:shadow-lg"
                          src={imageSrc}
                          alt={fileName}
                          loading="lazy"
                        />
                      );
                    })}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {memo.files
                    .filter(({ fileName }) => !imageRegExp.test(fileName))
                    .map(({ fileName, googleDriveFileId }, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleDownload(memo.seq, fileName, googleDriveFileId)}
                        className="flex items-center justify-between w-full px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring focus:ring-blue-300"
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
      {/* 스와이프된 경우 수정/삭제/분석 버튼 표시 */}
      {(!isScreenNarrow || isSwiped) && (
        <div className="relative top-0 right-0 h-full flex flex-col items-center justify-center space-y-4 p-2">
          {isEditing ? (
            <>
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
            </>
          ) : (
            <>
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
              {isAnalyzableFile() && (
                <button
                  onClick={() => handleAnalyze(memo.seq)}
                  className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-600 transition"
                  aria-label="분석"
                >
                  📑
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};