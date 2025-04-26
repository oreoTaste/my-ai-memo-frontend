import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useDarkMode } from "../contexts/DarkModeContext";
import { useUser } from "../contexts/UserContext";
import Navbar from "../components/Navbar";
import DarkButton from "../components/DarkButton";
import Searchbar from "../components/Searchbar";
import { Chat, ChatMessage } from "../types/chat";
import { MemoUser as ChatUser } from "../types/memo"; // assuming same shape: { id, loginId, name }

export const ChatRouter = () => {
  // Chat state
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChatSeq, setSelectedChatSeq] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState<string>("");

  // Loading & error
  const [isLoadingChats, setIsLoadingChats] = useState<boolean>(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Search/filter state
  const [query, setQuery] = useState<string>("");

  // Context
  const { isDarkMode } = useDarkMode();
  const { user: me } = useUser();

  // Scroll
  const messageListRef = useRef<HTMLDivElement>(null);

  // New chat form state
  const [isCreatingChat, setIsCreatingChat] = useState<boolean>(false);
  const [chatTitle, setChatTitle] = useState<string>("");
  const [searchLoginId, setSearchLoginId] = useState<string>("");
  const [searchUserResults, setSearchUserResults] = useState<ChatUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<ChatUser[]>([]);

  // Fetch chats
  useEffect(() => {
    const fetchChats = async () => {
      try {
        const res = await axios.get("/chat/list", { withCredentials: true, headers: { "X-API-Request": "true" } });
        setChats(res.data.result ? res.data.chatListDto : []);
      } catch {
        setError("채팅 목록을 불러오지 못했습니다.");
      } finally {
        setIsLoadingChats(false);
      }
    };
    fetchChats();
  }, []);

  // Filter chats by query
  const filteredChats = chats.filter(chat => {
    if (!query.trim()) return true;
    const titleMatch = chat.title?.toLowerCase().includes(query.toLowerCase());
    const memberMatch = chat.members.some(m =>
      m.user.loginId.toLowerCase().includes(query.toLowerCase()) ||
      m.user.name?.toLowerCase().includes(query.toLowerCase())
    );
    return titleMatch || memberMatch;
  });

  // Search users for chat creation
  const searchUsers = async () => {
    if (!searchLoginId.trim()) {
      setSearchUserResults([]);
      return;
    }
    try {
      const res = await axios.get(
        `/user/search`,
        { params: { loginId: searchLoginId }, withCredentials: true, headers: { "X-API-Request": "true" } }
      );
      setSearchUserResults(res.data.result ? res.data.users : []);
    } catch {
      setSearchUserResults([]);
    }
  };

  const toggleUserSelection = (u: ChatUser) => {
    setSelectedUsers(prev => prev.some(x => x.id === u.id)
      ? prev.filter(x => x.id !== u.id)
      : [...prev, u]
    );
    setSearchLoginId("");
    setSearchUserResults([]);
  };

  // Create chat with participant list
  const confirmCreateChat = async () => {
    if (selectedUsers.length === 0) {
      alert("참여자를 입력해주세요.");
      return;
    }
    try {
      const userIdListJson = JSON.stringify(selectedUsers.map(u => u.id));
      const res = await axios.post(
        "/chat/create",
        { title: chatTitle, userIdListJson },
        { withCredentials: true, headers: { "X-API-Request": "true" } }
      );

      if (res.data.result) {
        const newChat: Chat = res.data.chatListDto[0];

        setChats(prev => [...prev, newChat]);
        setSelectedChatSeq(newChat.chatSeq);
        setChatTitle("");
        setSelectedUsers([]);
        setIsCreatingChat(false);
      } else {
        setError(res.data.message?.[0] || "채팅방 생성에 실패했습니다.");
      }
    } catch {
      setError("채팅방 생성에 실패했습니다.");
    }
  };

  // Delete chat
  const deleteChat = async (seq: number) => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    try {
      const res = await axios.delete(
        "/chat/delete",
        { data: { chatSeq: seq }, withCredentials: true, headers: { "X-API-Request": "true" } }
      );
      if (res.data.result) {
        setChats(prev => prev.filter(c => c.chatSeq !== seq));
        if (selectedChatSeq === seq) { setSelectedChatSeq(null); setMessages([]); }
      }
    } catch {
      setError("채팅방 삭제에 실패했습니다.");
    }
  };

  // Fetch messages
  useEffect(() => {
    if (selectedChatSeq === null) return;
    const fetchMsgs = async () => {
      setIsLoadingMessages(true);
      try {
        const res = await axios.post(
          "/chat/detail",
          { chatSeq: selectedChatSeq },
          { withCredentials: true, headers: { "X-API-Request": "true" } }
        );

        setMessages(res.data.result ? res.data.chatMessageDto : []);
      } catch {
        setError("메시지를 불러오지 못했습니다.");
      } finally {
        setIsLoadingMessages(false);
      }
    };
    fetchMsgs();
  }, [selectedChatSeq]);

  // Auto-scroll
  useEffect(() => {
    if (messageListRef.current) messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
  }, [messages]);

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || selectedChatSeq === null) return;
    setIsSending(true);
    try {
      const res = await axios.post(
        "/chat/insert",
        { chatSeq: selectedChatSeq, message: newMessage },
        { withCredentials: true, headers: { "X-API-Request": "true" } }
      );

      let newChat = res.data.chatMessageDto[0];
      if (res.data.result) {
        setMessages(prev => [newChat, ...prev]);
        setNewMessage("");
      }
    } catch {
      setError("메시지 전송에 실패했습니다.");
    } finally {
      setIsSending(false);
    }
  };

  if (isLoadingChats) {
    return (
      <div className={`flex flex-col items-center pt-16 min-h-screen ${isDarkMode ? "bg-gray-900 text-white" : "bg-gray-200 text-gray-800"}`}>
        <Navbar isDarkMode={isDarkMode} />
        <DarkButton />
        <div className="text-center py-4">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center pt-16 min-h-screen ${isDarkMode ? "bg-gray-900 text-white" : "bg-gray-200 text-gray-800"}`}>
      <Navbar isDarkMode={isDarkMode} />
      <DarkButton />
      <Searchbar isDarkMode={isDarkMode} value={query} onChange={setQuery} />

      {/* New Chat Form */}
      <div className={`w-full max-w-4xl p-6 rounded-lg shadow-lg mb-4 ${isDarkMode ? "bg-gray-800" : "bg-white"}`}>
        {isCreatingChat ? (
          <>
            <div className="flex justify-between items-center mb-4">
              <input
                type="text"
                className="flex-1 p-2 border rounded-md mr-2"
                placeholder="채팅방 제목"
                value={chatTitle}
                onChange={e => setChatTitle(e.target.value)}
              />
              <button
                className="px-4 py-2 bg-red-500 text-white rounded-md"
                onClick={() => setIsCreatingChat(false)}
              >
                취소
              </button>
            </div>
            <div className="mb-4">
              <div className="flex space-x-2 mb-2">
                <input
                  type="text"
                  className="flex-1 p-2 border rounded-md"
                  placeholder="참여자 로그인 ID 검색"
                  value={searchLoginId}
                  onChange={e => setSearchLoginId(e.target.value)}
                />
                <button
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md"
                  onClick={searchUsers}
                >
                  검색
                </button>
              </div>
              {searchUserResults.length > 0 && (
                <ul className="border rounded-md max-h-40 overflow-y-auto mb-2">
                  {searchUserResults.map(u => (
                    <li
                      key={u.id}
                      className="p-2 cursor-pointer hover:bg-gray-200 flex justify-between"
                      onClick={() => toggleUserSelection(u)}
                    >
                      <span>{u.name} ({u.loginId})</span>
                      <span>{selectedUsers.some(x => x.id === u.id) ? '✓' : '+'}</span>
                    </li>
                  ))}
                </ul>
              )}
              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedUsers.map(u => (
                    <span key={u.id} className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full flex items-center">
                      {u.name}
                      <button className="ml-1" onClick={() => toggleUserSelection(u)}>×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <button
              className="px-6 py-2 bg-green-600 text-white rounded-md"
              onClick={confirmCreateChat}
            >
              채팅방 생성
            </button>
          </>
        ) : (
          <button
            className="px-4 py-2 bg-indigo-500 text-white rounded-md"
            onClick={() => setIsCreatingChat(true)}
          >
            새 채팅방 만들기
          </button>
        )}
      </div>

      {/* Chat List & Messages */}
      <div className="w-full max-w-4xl p-6 rounded-lg shadow-lg flex">
        {/* Chat List */}
        <div className="w-1/3 pr-4 border-r">
          <h2 className="text-xl font-bold mb-4">채팅 목록</h2>
          {filteredChats.length === 0 ? (
            <p className="text-gray-500">채팅이 없습니다.</p>
          ) : (
            <ul>
              {filteredChats.map(chat => (
                <li
                  key={chat.chatSeq}
                  onClick={() => setSelectedChatSeq(chat.chatSeq)}
                  className={`cursor-pointer p-2 mb-2 rounded flex justify-between items-center ${selectedChatSeq === chat.chatSeq ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-800'}`}
                >
                  <span>
                    {chat.members.length <= 1
                      ? '나의 채팅방'
                      : `${chat.members.find(m => m.user.id !== me?.id)?.user.loginId} 등 ${chat.members.length}명`}
                  </span>
                  <button onClick={e => { e.stopPropagation(); deleteChat(chat.chatSeq); }} className="text-red-500">🗑</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Messages */}
        <div className="w-2/3 pl-4">
          {selectedChatSeq === null ? (
            <p className="text-gray-500">채팅을 선택하세요.</p>
          ) : (
            <>
              <h2 className="text-xl font-bold mb-4">메시지</h2>
              {isLoadingMessages ? (
                <div className="text-center py-4">로딩 중...</div>
              ) : (
                <div ref={messageListRef} className="h-96 overflow-y-auto mb-4 p-4 border rounded-lg">
                  {messages.length === 0 ? (
                    <p className="text-gray-500">메시지가 없습니다.</p>
                  ) : (
                    messages.map(msg => (
                      <div key={msg.seq} className={`mb-2 flex ${msg?.insertId === me?.id ? 'justify-end' : 'justify-start'}`}>
                        <div className={`p-2 rounded-lg ${msg?.insertId === me?.id ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}>
                          <span className="font-bold">{msg?.user?.name || 'User'}:</span>
                          <span className="mx-2">{msg?.message}</span>
                          <span className="text-sm text-gray-400">{new Date(msg.createdAt).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
              <div className="flex">
                <input
                  type="text"
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && sendMessage()}
                  className={`flex-1 p-2 border rounded-l-md ${isDarkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-800'}`}
                  placeholder="메시지를 입력하세요..."
                  disabled={isSending}
                />
                <button
                  onClick={sendMessage}
                  disabled={isSending || !newMessage.trim()}
                  className={`px-4 py-2 rounded-r-md ${isDarkMode ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-500 text-white hover:bg-blue-600'} ${isSending || !newMessage.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isSending ? '전송 중...' : '전송'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      {error && <p className="text-red-500 mt-4">{error}</p>}
    </div>
  );
};
