import './App.css';
import PidMotor from './pid_motor';
import 'react-toastify/dist/ReactToastify.css';
import { Helmet } from 'react-helmet';


function App() {
  return (
    <div className="App">      
      <PidMotor />
      <Helmet>
        <title>PID Motor Control</title>
        <meta name="description" content="PID Motor Control Web Application" />
        <link rel="icon" href="/favicon.ico" />
      </Helmet>
    </div>
  );
}

export default App;
