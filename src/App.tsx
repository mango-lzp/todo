import './App.css';

const { invoke } = window.__TAURI__.tauri

const App = () => {
  invoke('greet', { name: 'lizhi' }).then(console.log)

  return (
    <div className="content">
      <h1>Rsbuild with React</h1>
      <p>Start building amazing things with Rsbuild.</p>
    </div>
  );
};

export default App;
