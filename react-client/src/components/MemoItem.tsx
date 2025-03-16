import React, { useState } from "react";
import { useSwipeable } from "react-swipeable";

export interface Memo {
  seq: number;
  title: string;
  subject?: string;
  raw: string;
  answer: string;
  createdAt: string;
  modifiedAt: string;
  files?: { fileName: string, googleDriveFileId: string }[];
  insertId: string;
}

interface MemoItemProps {
  memo: Memo;
  isDarkMode: boolean;
  isEditing: boolean;
  isExpanded: boolean;
  memoHeights?: { raw: number; answer: number };
  index: number;
  isScreenNarrow: boolean;
  // 부모에서 내려받은 이벤트 핸들러들
  startEditing: (memo: Memo) => void;
  cancelMemo: (memoSeq: number) => void;
  saveMemo: (memoSeq: number) => void;
  deleteMemo: (memoSeq: number) => void;
  toggleExpanded: (memoSeq: number) => void;
  textareaRefs: React.MutableRefObject<Map<string, HTMLTextAreaElement>>;
  // 수정 상태 관련 (부모에서 관리하는 수정 내용)
  editMemoContent?: {
    title: string;
    subject?: string;
    raw: string;
    answer: string;
  };
  updateEditMemoContent?: (
    newContent: Partial<{ title: string; subject?: string; raw: string; answer: string }>
  ) => void;
  handleDownload: (memoSeq: number, fileName: string, googleDriveFileId: string) => void;
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
  handleAnalyze
}) => {
  const [isSwiped, setIsSwiped] = useState(false);

  // useSwipeable은 컴포넌트 최상위에서 호출해야 함
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => isScreenNarrow && setIsSwiped(true),
    onSwipedRight: () => isScreenNarrow && setIsSwiped(false),
    preventScrollOnSwipe: true,
    trackTouch: true,
    trackMouse: true,
    delta: 50,
  });

  let imageRegExp = new RegExp(/\.(jpeg|jpg|png|jfif|gif|webp)$/i);
  let analyzableRegExp = new RegExp(/\.(jpeg|jpg|png|jfif|gif|webp|pdf)$/i);

  // 분석 가능한 파일인지 확인하는 헬퍼 함수
  const isAnalyzableFile = (): boolean => {
    return !!memo.files && memo.files.some(({ fileName }) => analyzableRegExp.test(fileName));
  };
  
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
              onChange={(e) =>
                updateEditMemoContent && updateEditMemoContent({ title: e.target.value })
              }
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
              onChange={(e) =>
                updateEditMemoContent && updateEditMemoContent({ subject: e.target.value })
              }
              className={`w-full p-2 border rounded-md mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500 ${
                isDarkMode
                  ? "bg-gray-800 text-white border-gray-600 hover:bg-gray-600"
                  : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"
              }`}
              placeholder="주제"
              style={{ height: "auto" }}
            />
            {/* 내용 입력 */}
            <textarea
              value={editMemoContent?.raw || ""}
              onChange={(e) => {
                updateEditMemoContent && updateEditMemoContent({ raw: e.target.value })
                e.target.style.height = "auto"; // 높이를 초기화
                e.target.style.height = `${e.target.scrollHeight}px`; // 내용에 맞게 높이 조정                
              }}
              className={`w-full p-2 border rounded-md mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500 ${
                isDarkMode
                  ? "bg-gray-800 text-white border-gray-600 hover:bg-gray-600"
                  : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"
              }`}
              placeholder="내용"
              style={{ height: "auto" }}
            />

            {/* 응답 입력 */}
            <textarea
              value={editMemoContent?.answer || ""}
              onChange={(e) => {

                updateEditMemoContent && updateEditMemoContent({ answer: e.target.value });
                e.target.style.height = "auto"; // 높이를 초기화
                e.target.style.height = `${e.target.scrollHeight}px`; // 내용에 맞게 높이 조정                
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
              ref={(el) => el && textareaRefs.current.set(`raw_${memo.seq}`, el)}
              className={`w-full mt-3 ${
                isDarkMode
                  ? "bg-gray-800 text-white placeholder-gray-500"
                  : "bg-gray-100 text-gray-800 placeholder-gray-500"
              } text-sm font-medium p-3 rounded-lg resize-none focus:outline-none`}
              style={{ height: memoHeights?.raw || "auto" }}
              value={`${memo.raw}`}
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
                {/* 이미지 영역 */}
                <div className="flex flex-wrap gap-4 mb-4">
                  {memo.files
                    .filter(({ fileName }) => imageRegExp.test(fileName))
                    .map(({ fileName, googleDriveFileId }, idx) => {
                      const imageSrc = googleDriveFileId
                        ? `https://drive.google.com/thumbnail?id=${googleDriveFileId}&sz=w144-h144`
                        : `/uploads/${memo.insertId}_${memo.seq}_${fileName}`;
                      const imageLink = googleDriveFileId
                        ? `https://drive.google.com/file/d/${googleDriveFileId}/view?usp=drive_link`/*`https://lh3.googleusercontent.com/d/${fileId}`*/
                        : `/uploads/${memo.insertId}_${memo.seq}_${fileName}`;
                      return (
                        <img
                          key={idx}
                          onClick={() => window.open(imageLink, '_blank')}
                          className="max-h-36 max-w-36 cursor-pointer rounded-lg border border-gray-300 hover:shadow-lg"
                          src={imageSrc}
                          alt={fileName}
                          loading="lazy" // 성능 최적화
                        />
                      );
                    })}
                </div>
                {/* 버튼 영역 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {memo.files
                    .filter(({ fileName }) => !imageRegExp.test(fileName))
                    .map(({ fileName, googleDriveFileId }, idx) => {
                      return (
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
                      );
                    })}
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
