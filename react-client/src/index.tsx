import ReactDOM from 'react-dom/client';
import App from './App';
import "./styles/styles.css";
import { DarkModeProvider } from './DarkModeContext';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <DarkModeProvider>
    <App />
  </DarkModeProvider>
);