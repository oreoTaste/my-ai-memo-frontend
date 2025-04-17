import React from 'react';

export const MemoUserTag = ({
  name,
  loginId,
  canEdit,
  isDarkMode,
  additionalCss,
  additionalTag,
}: {
  name: string;
  loginId: string;
  canEdit: boolean | undefined;
  isDarkMode: boolean;
  additionalCss?: string;
  additionalTag?: React.ReactNode; // React 노드로 변경
}) => {
  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium relative group ${
        additionalCss ?? ''
      } ${isDarkMode ? 'bg-indigo-700 text-white' : 'bg-indigo-100 text-indigo-800'}`}
      aria-label={`Shared by ${name} with ${canEdit ? 'edit' : 'view'} permission`}
    >
      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
        <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
      </svg>
      {name} ({loginId}) - {canEdit ? 'edit' : 'view'}
      <span className="absolute hidden group-hover:block bg-gray-800 text-white text-xs rounded p-1 -top-8 left-1/2 transform -translate-x-1/2 z-10">
        {canEdit ? '수정: 메모 편집 가능' : '조회: 메모 보기만 가능'}
      </span>
      {additionalTag} {/* 직접 렌더링 */}
    </span>
  );
};