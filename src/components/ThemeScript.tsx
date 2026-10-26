export default function ThemeScript() {
  // يطبّق الوضع الداكن قبل الرسم لمنع الوميض
  const code = `(function(){try{var t=localStorage.getItem('bbms_theme');if(t==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
