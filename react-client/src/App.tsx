import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { LoggedOutRouter } from './routers/logged-out-router';
import { MemoRouter } from './routers/memo-router';
import { RegisterRouter } from './routers/register-router';
import { RecordRouter } from './routers/record-router';
import { CodelistRouter } from './routers/codelist-router';
import { TodoRouter } from './routers/todo-router';
import { QueryRouter } from './routers/query-router';
import { UserProvider } from './contexts/UserContext';
import { DarkModeProvider } from './contexts/DarkModeContext';
import NotFound from './components/NotFound';

const ProtectedRoutes = () => {
  return (
    <Routes>
        {/* 로그인 화면이 /user/login 경로로 매핑됨 */}
        <Route path="/user/memos" element={<MemoRouter />}/>
        <Route path="/user/todos" element={<TodoRouter />} />
        <Route path="/user/records" element={<RecordRouter />} />
        <Route path="/codes" element={<CodelistRouter />} />
        <Route path="/queries" element={<QueryRouter />} />
        <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => {
  return (
    <DarkModeProvider>
      <Router>
        <Routes>
          {/* 메인화면 */}
          <Route path="/" element={<LoggedOutRouter />} />
          {/* 회원가입화면 */}
          <Route path="/register" element={<RegisterRouter />} />
          {/* 기타화면 */}
          <Route path="/*" element={<UserProvider>
                                      <ProtectedRoutes />
                                    </UserProvider>}/>
        </Routes>
      </Router>
    </DarkModeProvider>
  );
};


export default App;
