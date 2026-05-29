export const LANGUAGES = [
  {code:'en',name:'English',flag:'🇺🇸'},
  {code:'es',name:'Español',flag:'🇪🇸'},
  {code:'fr',name:'Français',flag:'🇫🇷'},
  {code:'pt',name:'Português',flag:'🇧🇷'},
  {code:'ar',name:'العربية',flag:'🇸🇦'},
  {code:'zh',name:'中文',flag:'🇨🇳'},
  {code:'ht',name:'Kreyòl Ayisyen',flag:'🇭🇹'},
  {code:'ru',name:'Русский',flag:'🇷🇺'},
  {code:'de',name:'Deutsch',flag:'🇩🇪'},
  {code:'it',name:'Italiano',flag:'🇮🇹'},
  {code:'ja',name:'日本語',flag:'🇯🇵'},
  {code:'ko',name:'한국어',flag:'🇰🇷'},
  {code:'hi',name:'हिन्दी',flag:'🇮🇳'},
  {code:'tr',name:'Türkçe',flag:'🇹🇷'},
  {code:'pl',name:'Polski',flag:'🇵🇱'},
  {code:'nl',name:'Nederlands',flag:'🇳🇱'},
  {code:'sv',name:'Svenska',flag:'🇸🇪'},
  {code:'no',name:'Norsk',flag:'🇳🇴'},
  {code:'da',name:'Dansk',flag:'🇩🇰'},
  {code:'fi',name:'Suomi',flag:'🇫🇮'},
  {code:'cs',name:'Čeština',flag:'🇨🇿'},
  {code:'sk',name:'Slovenčina',flag:'🇸🇰'},
  {code:'ro',name:'Română',flag:'🇷🇴'},
  {code:'hu',name:'Magyar',flag:'🇭🇺'},
  {code:'uk',name:'Українська',flag:'🇺🇦'},
  {code:'el',name:'Ελληνικά',flag:'🇬🇷'},
  {code:'he',name:'עברית',flag:'🇮🇱'},
  {code:'fa',name:'فارسی',flag:'🇮🇷'},
  {code:'ur',name:'اردو',flag:'🇵🇰'},
  {code:'bn',name:'বাংলা',flag:'🇧🇩'},
  {code:'vi',name:'Tiếng Việt',flag:'🇻🇳'},
  {code:'th',name:'ภาษาไทย',flag:'🇹🇭'},
  {code:'id',name:'Bahasa Indonesia',flag:'🇮🇩'},
  {code:'ms',name:'Bahasa Melayu',flag:'🇲🇾'},
  {code:'tl',name:'Filipino',flag:'🇵🇭'},
  {code:'sw',name:'Kiswahili',flag:'🇰🇪'},
  {code:'am',name:'አማርኛ',flag:'🇪🇹'},
  {code:'yo',name:'Yorùbá',flag:'🇳🇬'},
  {code:'zu',name:'Zulu',flag:'🇿🇦'},
  {code:'af',name:'Afrikaans',flag:'🇿🇦'},
];

export const getLang = () => localStorage.getItem('mechaLang') || 'en';
export const setLang = (code) => localStorage.setItem('mechaLang', code);
export const getLangName = () => {
  const code = getLang();
  return LANGUAGES.find(l => l.code === code) || LANGUAGES[0];
};
