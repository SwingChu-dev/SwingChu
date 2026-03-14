export type UniverseMarket = "NASDAQ" | "KOSPI" | "KOSDAQ";

export interface UniverseStock {
  id: string;
  name: string;
  nameEn: string;
  ticker: string;
  market: UniverseMarket;
  sector: string;
  currentPrice: number;
  marketCap: string;
}

export const PREDEFINED_IDS = new Set([
  "nvda","googl","orcl","ionq","sandisk","eon",
  "samsung","skhynix","hanwha","hyundai","doosan","woritech",
]);

// ─────────────────────────────────────────────────────────────────────────────
// 전체 종목 유니버스 (NASDAQ · KOSPI · KOSDAQ 상위 거래대금 기준)
// currentPrice: NASDAQ = KRW 환산(USD×1450), 국내 = 원화
// ─────────────────────────────────────────────────────────────────────────────
export const UNIVERSE_STOCKS: UniverseStock[] = [

  // ══════════════════════════════════════════════════════════════════════════
  // NASDAQ ─ 메가캡 / AI / 반도체
  // ══════════════════════════════════════════════════════════════════════════
  { id:"nvda_skip",  name:"엔비디아",           nameEn:"NVIDIA",              ticker:"NVDA",  market:"NASDAQ", sector:"AI반도체",           currentPrice:261363, marketCap:"6,400조" },
  { id:"googl_skip", name:"알파벳 A",            nameEn:"Alphabet A",          ticker:"GOOGL", market:"NASDAQ", sector:"AI/검색/클라우드",    currentPrice:438306, marketCap:"5,400조" },
  { id:"goog",       name:"알파벳 C",            nameEn:"Alphabet C",          ticker:"GOOG",  market:"NASDAQ", sector:"AI/검색/클라우드",    currentPrice:438306, marketCap:"5,400조" },
  { id:"orcl_skip",  name:"오라클",              nameEn:"Oracle",              ticker:"ORCL",  market:"NASDAQ", sector:"클라우드DB/AI",        currentPrice:224750, marketCap:"580조" },
  { id:"ionq_skip",  name:"아이온큐",            nameEn:"IonQ",                ticker:"IONQ",  market:"NASDAQ", sector:"양자컴퓨팅",           currentPrice:47850,  marketCap:"10조" },
  { id:"sndk_skip",  name:"샌디스크",            nameEn:"SanDisk",             ticker:"SNDK",  market:"NASDAQ", sector:"낸드플래시/스토리지",  currentPrice:958500, marketCap:"30조" },
  { id:"eonr_skip",  name:"EON 리소시스",        nameEn:"EON Resources",       ticker:"EONR",  market:"NASDAQ", sector:"희토류/자원",          currentPrice:2116,   marketCap:"0.1조" },
  { id:"aapl",  name:"애플",            nameEn:"Apple",               ticker:"AAPL",  market:"NASDAQ", sector:"IT/소비자전자",       currentPrice:283050, marketCap:"2,900조" },
  { id:"msft",  name:"마이크로소프트",   nameEn:"Microsoft",           ticker:"MSFT",  market:"NASDAQ", sector:"클라우드/AI/OS",      currentPrice:594500, marketCap:"4,400조" },
  { id:"amzn",  name:"아마존",          nameEn:"Amazon",              ticker:"AMZN",  market:"NASDAQ", sector:"이커머스/클라우드",   currentPrice:268250, marketCap:"2,800조" },
  { id:"meta",  name:"메타",            nameEn:"Meta",                ticker:"META",  market:"NASDAQ", sector:"소셜미디어/AI/AR",    currentPrice:754000, marketCap:"1,900조" },
  { id:"tsla",  name:"테슬라",          nameEn:"Tesla",               ticker:"TSLA",  market:"NASDAQ", sector:"전기차/AI/에너지",    currentPrice:253750, marketCap:"800조" },
  { id:"amd",   name:"AMD",             nameEn:"AMD",                 ticker:"AMD",   market:"NASDAQ", sector:"CPU/GPU/반도체",      currentPrice:174000, marketCap:"280조" },
  { id:"intc",  name:"인텔",            nameEn:"Intel",               ticker:"INTC",  market:"NASDAQ", sector:"CPU/반도체",          currentPrice:31900,  marketCap:"130조" },
  { id:"qcom",  name:"퀄컴",            nameEn:"Qualcomm",            ticker:"QCOM",  market:"NASDAQ", sector:"모바일AP/RF반도체",   currentPrice:224750, marketCap:"380조" },
  { id:"avgo",  name:"브로드컴",        nameEn:"Broadcom",            ticker:"AVGO",  market:"NASDAQ", sector:"네트워크반도체/AI",   currentPrice:268250, marketCap:"1,250조" },
  { id:"mu",    name:"마이크론",        nameEn:"Micron",              ticker:"MU",    market:"NASDAQ", sector:"메모리반도체/HBM",    currentPrice:130500, marketCap:"145조" },
  { id:"arm",   name:"ARM홀딩스",       nameEn:"ARM Holdings",        ticker:"ARM",   market:"NASDAQ", sector:"반도체IP설계",        currentPrice:188500, marketCap:"195조" },
  { id:"amat",  name:"어플라이드머티리얼", nameEn:"Applied Materials", ticker:"AMAT",  market:"NASDAQ", sector:"반도체장비",          currentPrice:239250, marketCap:"198조" },
  { id:"lrcx",  name:"램리서치",        nameEn:"Lam Research",        ticker:"LRCX",  market:"NASDAQ", sector:"반도체식각장비",      currentPrice:1087500,marketCap:"145조" },
  { id:"klac",  name:"KLA코퍼레이션",   nameEn:"KLA Corp",            ticker:"KLAC",  market:"NASDAQ", sector:"반도체검사장비",      currentPrice:1015000,marketCap:"136조" },
  { id:"asml",  name:"ASML",            nameEn:"ASML",                ticker:"ASML",  market:"NASDAQ", sector:"EUV노광장비",         currentPrice:1131000,marketCap:"448조" },
  { id:"tsm",   name:"TSMC",            nameEn:"TSMC",                ticker:"TSM",   market:"NASDAQ", sector:"파운드리",            currentPrice:268250, marketCap:"1,390조" },
  { id:"mrvl",  name:"마벨테크놀로지",  nameEn:"Marvell Tech",        ticker:"MRVL",  market:"NASDAQ", sector:"AI인프라/이더넷",     currentPrice:101500, marketCap:"86조" },
  { id:"txn",   name:"텍사스인스트루먼트", nameEn:"Texas Instruments", ticker:"TXN",   market:"NASDAQ", sector:"아날로그반도체",      currentPrice:253750, marketCap:"230조" },
  { id:"mpwr",  name:"모놀리식파워",    nameEn:"Monolithic Power",    ticker:"MPWR",  market:"NASDAQ", sector:"전력반도체",          currentPrice:725000, marketCap:"34조" },
  { id:"mchp",  name:"마이크로칩테크",  nameEn:"Microchip Technology",ticker:"MCHP",  market:"NASDAQ", sector:"MCU반도체",           currentPrice:71050,  marketCap:"38조" },
  { id:"swks",  name:"스카이웍스",      nameEn:"Skyworks Solutions",  ticker:"SWKS",  market:"NASDAQ", sector:"RF반도체",            currentPrice:87000,  marketCap:"14조" },
  { id:"on",    name:"온세미컨덕터",    nameEn:"ON Semiconductor",    ticker:"ON",    market:"NASDAQ", sector:"전력반도체/전기차",   currentPrice:87000,  marketCap:"25조" },
  { id:"wolf",  name:"울프스피드",      nameEn:"Wolfspeed",           ticker:"WOLF",  market:"NASDAQ", sector:"탄화규소반도체",      currentPrice:14500,  marketCap:"1.5조" },
  { id:"nxpi",  name:"NXP세미컨덕터",  nameEn:"NXP Semiconductors",  ticker:"NXPI",  market:"NASDAQ", sector:"자동차반도체",        currentPrice:319000, marketCap:"48조" },
  { id:"qrvo",  name:"콰보",           nameEn:"Qorvo",               ticker:"QRVO",  market:"NASDAQ", sector:"RF반도체/필터",       currentPrice:116000, marketCap:"9조" },
  { id:"entg",  name:"엔테그리스",     nameEn:"Entegris",            ticker:"ENTG",  market:"NASDAQ", sector:"반도체소재",          currentPrice:130500, marketCap:"18조" },
  { id:"mksi",  name:"MKS인스트루먼트", nameEn:"MKS Instruments",    ticker:"MKSI",  market:"NASDAQ", sector:"반도체공정장비",      currentPrice:145000, marketCap:"8조" },
  { id:"acls",  name:"액셀리스테크",   nameEn:"Axcelis Technologies", ticker:"ACLS",  market:"NASDAQ", sector:"이온주입장비",        currentPrice:130500, marketCap:"4조" },
  { id:"amkr",  name:"암코테크놀로지", nameEn:"Amkor Technology",    ticker:"AMKR",  market:"NASDAQ", sector:"반도체패키징",        currentPrice:34800,  marketCap:"8조" },
  { id:"form",  name:"폼팩터",         nameEn:"FormFactor",          ticker:"FORM",  market:"NASDAQ", sector:"반도체테스트",        currentPrice:37700,  marketCap:"2조" },
  { id:"ipgp",  name:"IPG포토닉스",   nameEn:"IPG Photonics",       ticker:"IPGP",  market:"NASDAQ", sector:"산업용레이저",        currentPrice:94250,  marketCap:"5조" },
  { id:"onto",  name:"온토이노베이션", nameEn:"Onto Innovation",     ticker:"ONTO",  market:"NASDAQ", sector:"반도체계측장비",      currentPrice:101500, marketCap:"4조" },
  { id:"algm",  name:"알레그로마이크로", nameEn:"Allegro MicroSystems",ticker:"ALGM", market:"NASDAQ", sector:"전류센서반도체",      currentPrice:29000,  marketCap:"5조" },
  { id:"mtsi",  name:"MACOM테크놀로지", nameEn:"MACOM Technology",   ticker:"MTSI",  market:"NASDAQ", sector:"RF아날로그반도체",    currentPrice:145000, marketCap:"10조" },
  { id:"crus",  name:"서러스로직",     nameEn:"Cirrus Logic",        ticker:"CRUS",  market:"NASDAQ", sector:"오디오칩",            currentPrice:152250, marketCap:"8조" },
  { id:"amba",  name:"암바렐라",       nameEn:"Ambarella",           ticker:"AMBA",  market:"NASDAQ", sector:"AI비전반도체",        currentPrice:94250,  marketCap:"3조" },
  { id:"slab",  name:"실리콘래버러토리스", nameEn:"Silicon Labs",    ticker:"SLAB",  market:"NASDAQ", sector:"IoT반도체",           currentPrice:159500, marketCap:"5조" },
  { id:"uctt",  name:"울트라클린홀딩스", nameEn:"Ultra Clean Holdings",ticker:"UCTT", market:"NASDAQ", sector:"반도체부품",         currentPrice:65250,  marketCap:"3조" },
  { id:"diod",  name:"다이오즈",       nameEn:"Diodes Inc",          ticker:"DIOD",  market:"NASDAQ", sector:"반도체부품",          currentPrice:66700,  marketCap:"2조" },
  { id:"lazr",  name:"루미나테크놀로지", nameEn:"Luminar Technologies",ticker:"LAZR", market:"NASDAQ", sector:"자율주행LiDAR",       currentPrice:10150,  marketCap:"1조" },

  // ══════════════════════════════════════════════════════════════════════════
  // NASDAQ ─ 소프트웨어 / SaaS / 클라우드
  // ══════════════════════════════════════════════════════════════════════════
  { id:"nflx",  name:"넷플릭스",       nameEn:"Netflix",             ticker:"NFLX",  market:"NASDAQ", sector:"OTT스트리밍",         currentPrice:1044000,marketCap:"445조" },
  { id:"crm",   name:"세일즈포스",     nameEn:"Salesforce",          ticker:"CRM",   market:"NASDAQ", sector:"CRM/SaaS",           currentPrice:420500, marketCap:"400조" },
  { id:"adbe",  name:"어도비",         nameEn:"Adobe",               ticker:"ADBE",  market:"NASDAQ", sector:"크리에이티브SW/AI",   currentPrice:551000, marketCap:"240조" },
  { id:"now",   name:"서비스나우",     nameEn:"ServiceNow",          ticker:"NOW",   market:"NASDAQ", sector:"기업IT자동화",        currentPrice:1450000,marketCap:"200조" },
  { id:"intu",  name:"인투이트",       nameEn:"Intuit",              ticker:"INTU",  market:"NASDAQ", sector:"세금/회계SaaS",       currentPrice:1015000,marketCap:"197조" },
  { id:"cdns",  name:"케이던스",       nameEn:"Cadence Design",      ticker:"CDNS",  market:"NASDAQ", sector:"EDA소프트웨어",       currentPrice:406000, marketCap:"76조" },
  { id:"snps",  name:"시놉시스",       nameEn:"Synopsys",            ticker:"SNPS",  market:"NASDAQ", sector:"EDA소프트웨어",       currentPrice:797500, marketCap:"82조" },
  { id:"anss",  name:"앤시스",         nameEn:"ANSYS",               ticker:"ANSS",  market:"NASDAQ", sector:"시뮬레이션SW",        currentPrice:507500, marketCap:"36조" },
  { id:"manh",  name:"맨해튼어소시에이츠", nameEn:"Manhattan Assoc",  ticker:"MANH",  market:"NASDAQ", sector:"공급망관리SW",        currentPrice:391500, marketCap:"24조" },
  { id:"wday",  name:"워크데이",       nameEn:"Workday",             ticker:"WDAY",  market:"NASDAQ", sector:"HR클라우드",          currentPrice:261000, marketCap:"54조" },
  { id:"hubs",  name:"허브스팟",       nameEn:"HubSpot",             ticker:"HUBS",  market:"NASDAQ", sector:"마케팅SaaS",          currentPrice:739500, marketCap:"36조" },
  { id:"ddog",  name:"데이터독",       nameEn:"Datadog",             ticker:"DDOG",  market:"NASDAQ", sector:"클라우드모니터링",    currentPrice:188500, marketCap:"60조" },
  { id:"snow",  name:"스노우플레이크", nameEn:"Snowflake",           ticker:"SNOW",  market:"NASDAQ", sector:"데이터클라우드",      currentPrice:210250, marketCap:"71조" },
  { id:"mdb",   name:"몽고DB",         nameEn:"MongoDB",             ticker:"MDB",   market:"NASDAQ", sector:"NoSQL데이터베이스",   currentPrice:348000, marketCap:"26조" },
  { id:"crwd",  name:"크라우드스트라이크", nameEn:"CrowdStrike",    ticker:"CRWD",  market:"NASDAQ", sector:"사이버보안/EDR",       currentPrice:493000, marketCap:"119조" },
  { id:"panw",  name:"팔로알토네트웍스", nameEn:"Palo Alto Networks",ticker:"PANW",  market:"NASDAQ", sector:"차세대방화벽",        currentPrice:253750, marketCap:"258조" },
  { id:"ftnt",  name:"포티넷",         nameEn:"Fortinet",            ticker:"FTNT",  market:"NASDAQ", sector:"네트워크보안",        currentPrice:101500, marketCap:"77조" },
  { id:"zs",    name:"지스케일러",     nameEn:"Zscaler",             ticker:"ZS",    market:"NASDAQ", sector:"클라우드보안",        currentPrice:232250, marketCap:"34조" },
  { id:"net",   name:"클라우드플레어", nameEn:"Cloudflare",          ticker:"NET",   market:"NASDAQ", sector:"엣지네트워크보안",    currentPrice:145000, marketCap:"46조" },
  { id:"team",  name:"아틀라시안",     nameEn:"Atlassian",           ticker:"TEAM",  market:"NASDAQ", sector:"협업/개발자도구",     currentPrice:232250, marketCap:"59조" },
  { id:"okta",  name:"옥타",           nameEn:"Okta",                ticker:"OKTA",  market:"NASDAQ", sector:"ID보안/IAM",          currentPrice:101500, marketCap:"16조" },
  { id:"twlo",  name:"트윌리오",       nameEn:"Twilio",              ticker:"TWLO",  market:"NASDAQ", sector:"클라우드통신API",     currentPrice:75375,  marketCap:"13조" },
  { id:"bill",  name:"빌닷컴",         nameEn:"Bill.com",            ticker:"BILL",  market:"NASDAQ", sector:"중소기업AP/AR",       currentPrice:84100,  marketCap:"8조" },
  { id:"pltr",  name:"팔란티어",       nameEn:"Palantir",            ticker:"PLTR",  market:"NASDAQ", sector:"AI빅데이터분석",      currentPrice:40600,  marketCap:"87조" },
  { id:"smci",  name:"슈퍼마이크로",   nameEn:"Super Micro",         ticker:"SMCI",  market:"NASDAQ", sector:"AI서버",              currentPrice:50750,  marketCap:"30조" },
  { id:"zi",    name:"줌인포",         nameEn:"ZoomInfo",            ticker:"ZI",    market:"NASDAQ", sector:"B2B영업인텔리전스",  currentPrice:20300,  marketCap:"8조" },
  { id:"mndy",  name:"먼데이닷컴",     nameEn:"Monday.com",          ticker:"MNDY",  market:"NASDAQ", sector:"업무관리플랫폼",     currentPrice:435000, marketCap:"25조" },
  { id:"cflt",  name:"컨플루언트",     nameEn:"Confluent",           ticker:"CFLT",  market:"NASDAQ", sector:"실시간데이터스트리밍",currentPrice:36250,  marketCap:"9조" },
  { id:"pcor",  name:"프로코어테크",   nameEn:"Procore Technologies",ticker:"PCOR",  market:"NASDAQ", sector:"건설관리SaaS",        currentPrice:94250,  marketCap:"12조" },
  { id:"asan",  name:"아사나",         nameEn:"Asana",               ticker:"ASAN",  market:"NASDAQ", sector:"프로젝트관리SW",      currentPrice:26100,  marketCap:"5조" },
  { id:"brze",  name:"브레이즈",       nameEn:"Braze",               ticker:"BRZE",  market:"NASDAQ", sector:"고객참여플랫폼",     currentPrice:65250,  marketCap:"7조" },
  { id:"smar",  name:"스마트시트",     nameEn:"Smartsheet",          ticker:"SMAR",  market:"NASDAQ", sector:"협업/업무관리",       currentPrice:72500,  marketCap:"7조" },
  { id:"wix",   name:"윅스닷컴",       nameEn:"Wix.com",             ticker:"WIX",   market:"NASDAQ", sector:"웹빌더SaaS",          currentPrice:217500, marketCap:"11조" },
  { id:"domo",  name:"도모",           nameEn:"Domo",                ticker:"DOMO",  market:"NASDAQ", sector:"BI/데이터시각화",     currentPrice:20300,  marketCap:"1조" },
  { id:"ncno",  name:"엔씨노",         nameEn:"nCino",               ticker:"NCNO",  market:"NASDAQ", sector:"은행클라우드SW",      currentPrice:37700,  marketCap:"5조" },
  { id:"tost",  name:"토스트",         nameEn:"Toast",               ticker:"TOST",  market:"NASDAQ", sector:"레스토랑POS",         currentPrice:55100,  marketCap:"18조" },
  { id:"vrsk",  name:"베리스크애널리틱스", nameEn:"Verisk Analytics",ticker:"VRSK",  market:"NASDAQ", sector:"데이터분석/보험",     currentPrice:406000, marketCap:"60조" },
  { id:"ctsh",  name:"코그니전트",     nameEn:"Cognizant",           ticker:"CTSH",  market:"NASDAQ", sector:"IT컨설팅/서비스",     currentPrice:101500, marketCap:"52조" },
  { id:"cdw",   name:"CDW코퍼레이션",  nameEn:"CDW Corp",            ticker:"CDW",   market:"NASDAQ", sector:"IT솔루션유통",        currentPrice:333500, marketCap:"23조" },
  { id:"cprt",  name:"코파트",         nameEn:"Copart",              ticker:"CPRT",  market:"NASDAQ", sector:"중고차경매",          currentPrice:87000,  marketCap:"85조" },
  { id:"payx",  name:"페이첵스",       nameEn:"Paychex",             ticker:"PAYX",  market:"NASDAQ", sector:"HR급여서비스",        currentPrice:203000, marketCap:"73조" },
  { id:"csco",  name:"시스코",         nameEn:"Cisco",               ticker:"CSCO",  market:"NASDAQ", sector:"네트워킹장비",        currentPrice:84100,  marketCap:"336조" },
  { id:"adp",   name:"ADP",            nameEn:"ADP",                 ticker:"ADP",   market:"NASDAQ", sector:"HR/급여SaaS",         currentPrice:319000, marketCap:"128조" },
  { id:"ibm",   name:"IBM",            nameEn:"IBM",                 ticker:"IBM",   market:"NASDAQ", sector:"IT서비스/AI/하이브리드클라우드",currentPrice:333500,marketCap:"213조" },
  { id:"hpe",   name:"HPE",            nameEn:"Hewlett Packard Enterprise",ticker:"HPE",market:"NASDAQ",sector:"서버/엣지컴퓨팅",  currentPrice:31900,  marketCap:"29조" },
  { id:"dell",  name:"델테크놀로지",   nameEn:"Dell Technologies",   ticker:"DELL",  market:"NASDAQ", sector:"PC/서버/AI인프라",    currentPrice:174000, marketCap:"84조" },
  { id:"vrt",   name:"버티브홀딩스",   nameEn:"Vertiv Holdings",     ticker:"VRT",   market:"NASDAQ", sector:"데이터센터냉각",      currentPrice:145000, marketCap:"38조" },
  { id:"ndaq",  name:"나스닥",         nameEn:"Nasdaq Inc",          ticker:"NDAQ",  market:"NASDAQ", sector:"금융인프라/거래소",   currentPrice:290000, marketCap:"51조" },

  // ══════════════════════════════════════════════════════════════════════════
  // NASDAQ ─ 인터넷 / 미디어 / 게임 / 통신
  // ══════════════════════════════════════════════════════════════════════════
  { id:"spot",  name:"스포티파이",     nameEn:"Spotify",             ticker:"SPOT",  market:"NASDAQ", sector:"음악스트리밍",        currentPrice:551000, marketCap:"107조" },
  { id:"rblx",  name:"로블록스",       nameEn:"Roblox",              ticker:"RBLX",  market:"NASDAQ", sector:"메타버스/게임",       currentPrice:52200,  marketCap:"30조" },
  { id:"roku",  name:"로쿠",           nameEn:"Roku",                ticker:"ROKU",  market:"NASDAQ", sector:"스트리밍TV플랫폼",    currentPrice:86250,  marketCap:"12조" },
  { id:"ttwo",  name:"테이크투인터랙티브", nameEn:"Take-Two Interactive",ticker:"TTWO",market:"NASDAQ",sector:"AAA게임/GTA",        currentPrice:253750, marketCap:"30조" },
  { id:"ea",    name:"일렉트로닉아츠", nameEn:"Electronic Arts",     ticker:"EA",    market:"NASDAQ", sector:"게임/스포츠",         currentPrice:210250, marketCap:"24조" },
  { id:"dkng",  name:"드래프트킹스",   nameEn:"DraftKings",          ticker:"DKNG",  market:"NASDAQ", sector:"스포츠베팅",          currentPrice:46400,  marketCap:"22조" },
  { id:"penn",  name:"펜엔터테인먼트", nameEn:"PENN Entertainment",  ticker:"PENN",  market:"NASDAQ", sector:"카지노/스포츠베팅",   currentPrice:26100,  marketCap:"4조" },
  { id:"mtch",  name:"매치그룹",       nameEn:"Match Group",         ticker:"MTCH",  market:"NASDAQ", sector:"데이팅앱/틴더",       currentPrice:43500,  marketCap:"11조" },
  { id:"iac",   name:"IAC",            nameEn:"IAC Inc",             ticker:"IAC",   market:"NASDAQ", sector:"인터넷미디어지주",    currentPrice:79750,  marketCap:"5조" },
  { id:"tmus",  name:"T-모바일US",     nameEn:"T-Mobile US",         ticker:"TMUS",  market:"NASDAQ", sector:"통신/5G",             currentPrice:333500, marketCap:"157조" },
  { id:"cmcsa", name:"컴캐스트",       nameEn:"Comcast",             ticker:"CMCSA", market:"NASDAQ", sector:"케이블TV/브로드밴드", currentPrice:52200,  marketCap:"205조" },
  { id:"chtr",  name:"차터커뮤니케이션스", nameEn:"Charter Communications",ticker:"CHTR",market:"NASDAQ",sector:"케이블/인터넷",   currentPrice:551000, marketCap:"40조" },
  { id:"wbd",   name:"워너브라더스디스커버리", nameEn:"Warner Bros Discovery",ticker:"WBD",market:"NASDAQ",sector:"미디어/스트리밍",currentPrice:14500,  marketCap:"37조" },
  { id:"para",  name:"파라마운트글로벌", nameEn:"Paramount Global",  ticker:"PARA",  market:"NASDAQ", sector:"미디어/스트리밍",     currentPrice:14500,  marketCap:"10조" },
  { id:"ntes",  name:"넷이즈",         nameEn:"NetEase",             ticker:"NTES",  market:"NASDAQ", sector:"게임/교육/중국",      currentPrice:137750, marketCap:"47조" },
  { id:"lyft",  name:"리프트",         nameEn:"Lyft",                ticker:"LYFT",  market:"NASDAQ", sector:"차량공유",            currentPrice:18850,  marketCap:"7조" },
  { id:"ttd",   name:"더트레이드데스크", nameEn:"The Trade Desk",   ticker:"TTD",   market:"NASDAQ", sector:"프로그래매틱광고",    currentPrice:145000, marketCap:"35조" },
  { id:"gtlb",  name:"깃랩",           nameEn:"GitLab",              ticker:"GTLB",  market:"NASDAQ", sector:"데브옵스플랫폼",      currentPrice:72500,  marketCap:"12조" },
  { id:"docu",  name:"도큐사인",       nameEn:"DocuSign",            ticker:"DOCU",  market:"NASDAQ", sector:"전자서명",            currentPrice:87000,  marketCap:"17조" },
  { id:"zm",    name:"줌비디오",       nameEn:"Zoom Video",          ticker:"ZM",    market:"NASDAQ", sector:"화상회의",            currentPrice:94250,  marketCap:"29조" },

  // ══════════════════════════════════════════════════════════════════════════
  // NASDAQ ─ 이커머스 / 소비 / 여행
  // ══════════════════════════════════════════════════════════════════════════
  { id:"shop",  name:"쇼피파이",       nameEn:"Shopify",             ticker:"SHOP",  market:"NASDAQ", sector:"이커머스플랫폼",      currentPrice:137750, marketCap:"117조" },
  { id:"abnb",  name:"에어비앤비",     nameEn:"Airbnb",              ticker:"ABNB",  market:"NASDAQ", sector:"숙박공유플랫폼",      currentPrice:188500, marketCap:"119조" },
  { id:"bkng",  name:"부킹홀딩스",     nameEn:"Booking Holdings",    ticker:"BKNG",  market:"NASDAQ", sector:"온라인여행/호텔",     currentPrice:7250000,marketCap:"120조" },
  { id:"expe",  name:"익스피디아",     nameEn:"Expedia Group",       ticker:"EXPE",  market:"NASDAQ", sector:"온라인여행",          currentPrice:261000, marketCap:"17조" },
  { id:"trip",  name:"트립어드바이저", nameEn:"TripAdvisor",         ticker:"TRIP",  market:"NASDAQ", sector:"여행리뷰플랫폼",      currentPrice:26100,  marketCap:"4조" },
  { id:"cost",  name:"코스트코",       nameEn:"Costco",              ticker:"COST",  market:"NASDAQ", sector:"창고형할인마트",      currentPrice:1392000,marketCap:"610조" },
  { id:"orly",  name:"오라일리오토",   nameEn:"O'Reilly Auto Parts", ticker:"ORLY",  market:"NASDAQ", sector:"자동차부품유통",      currentPrice:2030000,marketCap:"57조" },
  { id:"pcar",  name:"팩카",           nameEn:"PACCAR",              ticker:"PCAR",  market:"NASDAQ", sector:"트럭/상용차",         currentPrice:130500, marketCap:"44조" },
  { id:"fast",  name:"패스트날",       nameEn:"Fastenal",            ticker:"FAST",  market:"NASDAQ", sector:"산업용부품유통",      currentPrice:108750, marketCap:"59조" },
  { id:"odfl",  name:"올드도미니언",   nameEn:"Old Dominion Freight",ticker:"ODFL",  market:"NASDAQ", sector:"LTL화물운송",         currentPrice:290000, marketCap:"34조" },
  { id:"wba",   name:"월그린스부츠",   nameEn:"Walgreens Boots",     ticker:"WBA",   market:"NASDAQ", sector:"약국체인",            currentPrice:14500,  marketCap:"12조" },
  { id:"khc",   name:"크래프트하인즈", nameEn:"Kraft Heinz",         ticker:"KHC",   market:"NASDAQ", sector:"글로벌식품",          currentPrice:43500,  marketCap:"52조" },
  { id:"mdlz",  name:"몬델리즈",       nameEn:"Mondelez",            ticker:"MDLZ",  market:"NASDAQ", sector:"과자/식품",           currentPrice:87000,  marketCap:"111조" },
  { id:"sbux",  name:"스타벅스",       nameEn:"Starbucks",           ticker:"SBUX",  market:"NASDAQ", sector:"커피체인",            currentPrice:116000, marketCap:"127조" },
  { id:"mnst",  name:"몬스터베버리지", nameEn:"Monster Beverage",    ticker:"MNST",  market:"NASDAQ", sector:"에너지음료",          currentPrice:58000,  marketCap:"58조" },
  { id:"celh",  name:"셀시우스홀딩스", nameEn:"Celsius Holdings",    ticker:"CELH",  market:"NASDAQ", sector:"에너지음료",          currentPrice:50750,  marketCap:"8조" },
  { id:"lulu",  name:"룰루레몬",       nameEn:"Lululemon",           ticker:"LULU",  market:"NASDAQ", sector:"스포츠의류",          currentPrice:391500, marketCap:"46조" },
  { id:"ebay",  name:"이베이",         nameEn:"eBay",                ticker:"EBAY",  market:"NASDAQ", sector:"이커머스마켓플레이스",currentPrice:87000,  marketCap:"24조" },
  { id:"pypl",  name:"페이팔",         nameEn:"PayPal",              ticker:"PYPL",  market:"NASDAQ", sector:"핀테크/결제",         currentPrice:94250,  marketCap:"65조" },
  { id:"uber",  name:"우버",           nameEn:"Uber",                ticker:"UBER",  market:"NASDAQ", sector:"모빌리티/배달",       currentPrice:104400, marketCap:"220조" },
  { id:"meli",  name:"메르카도리브레", nameEn:"MercadoLibre",        ticker:"MELI",  market:"NASDAQ", sector:"라틴아메리카이커머스",currentPrice:2900000,marketCap:"100조" },
  { id:"duol",  name:"듀오링고",       nameEn:"Duolingo",            ticker:"DUOL",  market:"NASDAQ", sector:"AI언어교육앱",        currentPrice:507500, marketCap:"15조" },
  { id:"axon",  name:"액슨엔터프라이즈", nameEn:"Axon Enterprise",  ticker:"AXON",  market:"NASDAQ", sector:"공공안전/보디캠",     currentPrice:870000, marketCap:"45조" },
  { id:"deck",  name:"데커스아웃도어", nameEn:"Deckers Outdoor",     ticker:"DECK",  market:"NASDAQ", sector:"UGG/HOKA신발",        currentPrice:1305000,marketCap:"34조" },
  { id:"fico",  name:"FICO",           nameEn:"FICO",                ticker:"FICO",  market:"NASDAQ", sector:"신용평가SW",          currentPrice:2175000,marketCap:"56조" },
  { id:"gehc",  name:"GE헬스케어",     nameEn:"GE HealthCare",       ticker:"GEHC",  market:"NASDAQ", sector:"의료기기/AI진단",     currentPrice:87000,  marketCap:"37조" },
  { id:"idxx",  name:"IDEXX래버러토리스", nameEn:"IDEXX Laboratories",ticker:"IDXX", market:"NASDAQ", sector:"반려동물진단",        currentPrice:580000, marketCap:"48조" },
  { id:"podd",  name:"인슐렛",         nameEn:"Insulet Corp",        ticker:"PODD",  market:"NASDAQ", sector:"인슐린펌프/의료기기", currentPrice:290000, marketCap:"20조" },

  // ══════════════════════════════════════════════════════════════════════════
  // NASDAQ ─ 바이오 / 헬스케어
  // ══════════════════════════════════════════════════════════════════════════
  { id:"regn",  name:"리제네론",       nameEn:"Regeneron",           ticker:"REGN",  market:"NASDAQ", sector:"바이오항체의약품",    currentPrice:870000, marketCap:"65조" },
  { id:"gild",  name:"길리어드사이언스", nameEn:"Gilead Sciences",   ticker:"GILD",  market:"NASDAQ", sector:"항바이러스/항암",     currentPrice:130500, marketCap:"112조" },
  { id:"amgn",  name:"암젠",           nameEn:"Amgen",               ticker:"AMGN",  market:"NASDAQ", sector:"바이오테크/비만",     currentPrice:406000, marketCap:"148조" },
  { id:"mrna",  name:"모더나",         nameEn:"Moderna",             ticker:"MRNA",  market:"NASDAQ", sector:"mRNA백신/항암",       currentPrice:58000,  marketCap:"15조" },
  { id:"vrtx",  name:"버텍스파마슈티컬", nameEn:"Vertex Pharma",    ticker:"VRTX",  market:"NASDAQ", sector:"희귀질환/CF치료제",  currentPrice:696000, marketCap:"113조" },
  { id:"biib",  name:"바이오젠",       nameEn:"Biogen",              ticker:"BIIB",  market:"NASDAQ", sector:"신경계질환바이오",    currentPrice:246500, marketCap:"36조" },
  { id:"ilmn",  name:"일루미나",       nameEn:"Illumina",            ticker:"ILMN",  market:"NASDAQ", sector:"유전체분석/NGS",      currentPrice:174000, marketCap:"28조" },
  { id:"alny",  name:"알나일람파마",   nameEn:"Alnylam Pharma",      ticker:"ALNY",  market:"NASDAQ", sector:"RNA간섭치료제",       currentPrice:406000, marketCap:"34조" },
  { id:"bmrn",  name:"바이오마린",     nameEn:"BioMarin Pharma",     ticker:"BMRN",  market:"NASDAQ", sector:"희귀유전질환",        currentPrice:101500, marketCap:"19조" },
  { id:"exas",  name:"엑잭트사이언스", nameEn:"Exact Sciences",      ticker:"EXAS",  market:"NASDAQ", sector:"암조기진단",          currentPrice:101500, marketCap:"16조" },
  { id:"crsp",  name:"크리스퍼테라퓨틱스", nameEn:"CRISPR Therapeutics",ticker:"CRSP",market:"NASDAQ",sector:"유전자편집치료제",   currentPrice:58000,  marketCap:"5조" },
  { id:"beam",  name:"빔테라퓨틱스",   nameEn:"Beam Therapeutics",   ticker:"BEAM",  market:"NASDAQ", sector:"염기편집치료제",      currentPrice:31900,  marketCap:"2조" },
  { id:"ntla",  name:"인텔리아테라퓨틱스", nameEn:"Intellia Therapeutics",ticker:"NTLA",market:"NASDAQ",sector:"생체내유전자편집",  currentPrice:20300,  marketCap:"1.5조" },
  { id:"srpt",  name:"사렙타테라퓨틱스", nameEn:"Sarepta Therapeutics",ticker:"SRPT",market:"NASDAQ", sector:"근육질환유전자치료",  currentPrice:174000, marketCap:"13조" },
  { id:"acad",  name:"아카디아파마",   nameEn:"ACADIA Pharma",       ticker:"ACAD",  market:"NASDAQ", sector:"중추신경계",          currentPrice:29000,  marketCap:"3조" },
  { id:"arwr",  name:"애로우헤드파마", nameEn:"Arrowhead Pharma",    ticker:"ARWR",  market:"NASDAQ", sector:"RNA치료제",           currentPrice:36250,  marketCap:"4조" },
  { id:"rare",  name:"울트라제닉스",   nameEn:"Ultragenyx",          ticker:"RARE",  market:"NASDAQ", sector:"희귀유전질환",        currentPrice:79750,  marketCap:"5조" },
  { id:"rxrx",  name:"리커전파마",     nameEn:"Recursion Pharma",    ticker:"RXRX",  market:"NASDAQ", sector:"AI신약개발",          currentPrice:11600,  marketCap:"3조" },
  { id:"nvax",  name:"노바백스",       nameEn:"Novavax",             ticker:"NVAX",  market:"NASDAQ", sector:"바이러스백신",        currentPrice:11600,  marketCap:"2조" },
  { id:"algn2", name:"얼라인테크놀로지", nameEn:"Align Technology",  ticker:"ALGN",  market:"NASDAQ", sector:"투명치아교정",        currentPrice:246500, marketCap:"19조" },
  { id:"isrg",  name:"인튜이티브서지컬", nameEn:"Intuitive Surgical",ticker:"ISRG",  market:"NASDAQ", sector:"수술로봇시스템",      currentPrice:754000, marketCap:"138조" },
  { id:"holx",  name:"홀로직",         nameEn:"Hologic",             ticker:"HOLX",  market:"NASDAQ", sector:"여성건강의료기기",    currentPrice:94250,  marketCap:"16조" },
  { id:"dxcm",  name:"덱스콤",         nameEn:"DexCom",              ticker:"DXCM",  market:"NASDAQ", sector:"연속혈당모니터링",    currentPrice:101500, marketCap:"38조" },

  // ══════════════════════════════════════════════════════════════════════════
  // NASDAQ ─ AI / 양자컴퓨팅 / 크립토
  // ══════════════════════════════════════════════════════════════════════════
  { id:"app",   name:"앱러빈",         nameEn:"AppLovin",            ticker:"APP",   market:"NASDAQ", sector:"AI광고/앱마케팅",     currentPrice:580000, marketCap:"150조" },
  { id:"mstr",  name:"마이크로스트래티지", nameEn:"MicroStrategy",   ticker:"MSTR",  market:"NASDAQ", sector:"비트코인/SW",         currentPrice:580000, marketCap:"80조" },
  { id:"path",  name:"유아이패스",     nameEn:"UiPath",              ticker:"PATH",  market:"NASDAQ", sector:"RPA/AI자동화",        currentPrice:21750,  marketCap:"9조" },
  { id:"qubt",  name:"퀀텀컴퓨팅",     nameEn:"Quantum Computing",   ticker:"QUBT",  market:"NASDAQ", sector:"양자컴퓨팅",          currentPrice:26100,  marketCap:"2조" },
  { id:"rgti",  name:"리게티컴퓨팅",   nameEn:"Rigetti Computing",   ticker:"RGTI",  market:"NASDAQ", sector:"양자컴퓨팅",          currentPrice:17400,  marketCap:"2조" },
  { id:"qbts",  name:"D-웨이브퀀텀",   nameEn:"D-Wave Quantum",      ticker:"QBTS",  market:"NASDAQ", sector:"양자어닐링컴퓨팅",    currentPrice:7250,   marketCap:"1조" },
  { id:"arqq",  name:"아르킷퀀텀",     nameEn:"Arqit Quantum",       ticker:"ARQQ",  market:"NASDAQ", sector:"양자암호화",          currentPrice:14500,  marketCap:"1조" },
  { id:"soun",  name:"사운드하운드AI", nameEn:"SoundHound AI",       ticker:"SOUN",  market:"NASDAQ", sector:"AI음성인식",          currentPrice:14500,  marketCap:"4조" },
  { id:"bbai",  name:"빅베어AI",       nameEn:"BigBear.ai",          ticker:"BBAI",  market:"NASDAQ", sector:"AI의사결정/국방",     currentPrice:4350,   marketCap:"0.7조" },
  { id:"coin",  name:"코인베이스",     nameEn:"Coinbase",            ticker:"COIN",  market:"NASDAQ", sector:"암호화폐거래소",      currentPrice:304500, marketCap:"72조" },
  { id:"mara",  name:"마라톤디지털",   nameEn:"Marathon Digital",    ticker:"MARA",  market:"NASDAQ", sector:"비트코인채굴",        currentPrice:26100,  marketCap:"7조" },
  { id:"riot",  name:"리오트플랫폼스", nameEn:"Riot Platforms",      ticker:"RIOT",  market:"NASDAQ", sector:"비트코인채굴",        currentPrice:14500,  marketCap:"4조" },
  { id:"clsk",  name:"클린스파크",     nameEn:"CleanSpark",          ticker:"CLSK",  market:"NASDAQ", sector:"비트코인채굴",        currentPrice:17400,  marketCap:"3조" },
  { id:"hut",   name:"헛에잇마이닝",   nameEn:"Hut 8 Mining",        ticker:"HUT",   market:"NASDAQ", sector:"비트코인채굴",        currentPrice:18850,  marketCap:"3조" },
  { id:"wulf",  name:"테라울프",       nameEn:"TeraWulf",            ticker:"WULF",  market:"NASDAQ", sector:"청정에너지비트코인채굴",currentPrice:10150, marketCap:"2조" },
  { id:"corz",  name:"코어사이언티픽", nameEn:"Core Scientific",     ticker:"CORZ",  market:"NASDAQ", sector:"비트코인채굴/AI서버", currentPrice:21750,  marketCap:"5조" },

  // ══════════════════════════════════════════════════════════════════════════
  // NASDAQ ─ 전기차 / 우주 / UAM / 에너지
  // ══════════════════════════════════════════════════════════════════════════
  { id:"rivn",  name:"리비안",         nameEn:"Rivian",              ticker:"RIVN",  market:"NASDAQ", sector:"전기트럭/SUV",        currentPrice:14500,  marketCap:"15조" },
  { id:"lcid",  name:"루시드그룹",     nameEn:"Lucid Group",         ticker:"LCID",  market:"NASDAQ", sector:"전기세단",            currentPrice:3045,   marketCap:"7조" },
  { id:"nio",   name:"니오",           nameEn:"NIO",                 ticker:"NIO",   market:"NASDAQ", sector:"중국전기차",          currentPrice:5075,   marketCap:"11조" },
  { id:"li",    name:"리오토",         nameEn:"Li Auto",             ticker:"LI",    market:"NASDAQ", sector:"중국전기SUV",         currentPrice:39150,  marketCap:"38조" },
  { id:"achr",  name:"아처에비에이션", nameEn:"Archer Aviation",     ticker:"ACHR",  market:"NASDAQ", sector:"에어택시UAM",         currentPrice:14500,  marketCap:"4조" },
  { id:"joby",  name:"조비에비에이션", nameEn:"Joby Aviation",       ticker:"JOBY",  market:"NASDAQ", sector:"에어택시UAM",         currentPrice:11600,  marketCap:"6조" },
  { id:"rklb",  name:"로켓랩USA",      nameEn:"Rocket Lab USA",      ticker:"RKLB",  market:"NASDAQ", sector:"소형발사체/우주",     currentPrice:36250,  marketCap:"12조" },
  { id:"hood",  name:"로빈후드마켓",   nameEn:"Robinhood Markets",   ticker:"HOOD",  market:"NASDAQ", sector:"리테일증권/핀테크",   currentPrice:72500,  marketCap:"40조" },
  { id:"sq2",   name:"블록(스퀘어)",   nameEn:"Block Inc",           ticker:"XYZ",   market:"NASDAQ", sector:"핀테크/비트코인",     currentPrice:116000, marketCap:"50조" },
  { id:"sofi",  name:"소파이테크",     nameEn:"SoFi Technologies",   ticker:"SOFI",  market:"NASDAQ", sector:"디지털뱅크",          currentPrice:13050,  marketCap:"14조" },
  { id:"upst",  name:"업스타트",       nameEn:"Upstart",             ticker:"UPST",  market:"NASDAQ", sector:"AI대출",              currentPrice:72500,  marketCap:"6조" },
  { id:"afrm",  name:"어펌홀딩스",     nameEn:"Affirm Holdings",     ticker:"AFRM",  market:"NASDAQ", sector:"BNPL",               currentPrice:58000,  marketCap:"18조" },
  { id:"enph",  name:"엔페이즈에너지", nameEn:"Enphase Energy",      ticker:"ENPH",  market:"NASDAQ", sector:"태양광마이크로인버터",currentPrice:101500, marketCap:"10조" },
  { id:"fslr",  name:"퍼스트솔라",     nameEn:"First Solar",         ticker:"FSLR",  market:"NASDAQ", sector:"박막태양광패널",      currentPrice:232000, marketCap:"17조" },
  { id:"plug",  name:"플러그파워",     nameEn:"Plug Power",          ticker:"PLUG",  market:"NASDAQ", sector:"수소연료전지",        currentPrice:4350,   marketCap:"2조" },
  { id:"fcel",  name:"퓨얼셀에너지",   nameEn:"FuelCell Energy",     ticker:"FCEL",  market:"NASDAQ", sector:"탄산연료전지",        currentPrice:1450,   marketCap:"0.5조" },
  { id:"blnk",  name:"블링크충전",     nameEn:"Blink Charging",      ticker:"BLNK",  market:"NASDAQ", sector:"EV충전인프라",        currentPrice:7250,   marketCap:"0.4조" },
  { id:"nkla",  name:"니콜라",         nameEn:"Nikola",              ticker:"NKLA",  market:"NASDAQ", sector:"수소트럭",            currentPrice:725,    marketCap:"0.2조" },
  { id:"run2",  name:"선런",           nameEn:"Sunrun",              ticker:"RUN",   market:"NASDAQ", sector:"가정용태양광",        currentPrice:17400,  marketCap:"4조" },
  { id:"envx",  name:"에노빅스",       nameEn:"Enovix",              ticker:"ENVX",  market:"NASDAQ", sector:"차세대배터리",        currentPrice:11600,  marketCap:"2조" },

  // ══════════════════════════════════════════════════════════════════════════
  // NASDAQ ─ 글로벌 / 중국 / 동남아
  // ══════════════════════════════════════════════════════════════════════════
  { id:"baba",  name:"알리바바",       nameEn:"Alibaba",             ticker:"BABA",  market:"NASDAQ", sector:"이커머스/클라우드",   currentPrice:130500, marketCap:"230조" },
  { id:"pdd",   name:"PDD홀딩스(테무)", nameEn:"PDD Holdings",       ticker:"PDD",   market:"NASDAQ", sector:"이커머스/저가소비",   currentPrice:181250, marketCap:"250조" },
  { id:"bidu",  name:"바이두",         nameEn:"Baidu",               ticker:"BIDU",  market:"NASDAQ", sector:"AI검색/자율주행",     currentPrice:101500, marketCap:"36조" },
  { id:"jd",    name:"징둥닷컴",       nameEn:"JD.com",              ticker:"JD",    market:"NASDAQ", sector:"B2C이커머스/물류",    currentPrice:43500,  marketCap:"67조" },
  { id:"se",    name:"씨리미티드",     nameEn:"Sea Limited",         ticker:"SE",    market:"NASDAQ", sector:"동남아게임/이커머스", currentPrice:101500, marketCap:"57조" },
  { id:"grab",  name:"그랩홀딩스",     nameEn:"Grab Holdings",       ticker:"GRAB",  market:"NASDAQ", sector:"동남아슈퍼앱",        currentPrice:5800,   marketCap:"25조" },

  // ══════════════════════════════════════════════════════════════════════════
  // KOSPI ─ 반도체 / IT
  // ══════════════════════════════════════════════════════════════════════════
  { id:"005930_skip", name:"삼성전자",   nameEn:"Samsung Electronics", ticker:"005930", market:"KOSPI", sector:"반도체/가전/디스플레이", currentPrice:184000, marketCap:"1,097조" },
  { id:"000660_skip", name:"SK하이닉스", nameEn:"SK Hynix",          ticker:"000660", market:"KOSPI", sector:"DRAM/HBM/낸드",       currentPrice:915000, marketCap:"660조" },
  { id:"012450_skip", name:"한화에어로스페이스", nameEn:"Hanwha Aerospace",ticker:"012450",market:"KOSPI",sector:"방산/우주항공",    currentPrice:1474000,marketCap:"20조" },
  { id:"005380_skip", name:"현대차",     nameEn:"Hyundai Motor",     ticker:"005380", market:"KOSPI", sector:"자동차/전기차/수소",  currentPrice:519000, marketCap:"23조" },
  { id:"034020_skip", name:"두산에너빌리티", nameEn:"Doosan Enerbility",ticker:"034020",market:"KOSPI",sector:"원전/가스터빈",     currentPrice:106100, marketCap:"8조" },
  { id:"009150", name:"삼성전기",       nameEn:"Samsung Electro-Mechanics", ticker:"009150",market:"KOSPI",sector:"MLCC/카메라모듈",currentPrice:145000, marketCap:"10조" },
  { id:"011070", name:"LG이노텍",       nameEn:"LG Innotek",        ticker:"011070", market:"KOSPI", sector:"카메라모듈/전장부품", currentPrice:180000, marketCap:"4조" },
  { id:"000990", name:"DB하이텍",       nameEn:"DB HiTek",          ticker:"000990", market:"KOSPI", sector:"8인치파운드리",       currentPrice:30000,  marketCap:"1.5조" },
  { id:"035420", name:"NAVER",          nameEn:"Naver",             ticker:"035420", market:"KOSPI", sector:"검색/웹툰/클라우드",  currentPrice:170000, marketCap:"27조" },
  { id:"035720", name:"카카오",         nameEn:"Kakao",             ticker:"035720", market:"KOSPI", sector:"메신저/핀테크/콘텐츠",currentPrice:42000,  marketCap:"19조" },
  { id:"259960", name:"크래프톤",       nameEn:"Krafton",           ticker:"259960", market:"KOSPI", sector:"배틀그라운드/게임",   currentPrice:280000, marketCap:"23조" },
  { id:"323410", name:"카카오뱅크",     nameEn:"KakaoBank",         ticker:"323410", market:"KOSPI", sector:"인터넷은행",          currentPrice:22000,  marketCap:"10조" },
  { id:"377300", name:"카카오페이",     nameEn:"KakaoPay",          ticker:"377300", market:"KOSPI", sector:"간편결제/핀테크",     currentPrice:24000,  marketCap:"3조" },
  { id:"018260", name:"삼성에스디에스", nameEn:"Samsung SDS",       ticker:"018260", market:"KOSPI", sector:"IT서비스/클라우드",   currentPrice:160000, marketCap:"12조" },
  { id:"402340", name:"SK스퀘어",       nameEn:"SK Square",         ticker:"402340", market:"KOSPI", sector:"IT투자지주",          currentPrice:55000,  marketCap:"5조" },
  { id:"032640", name:"LG유플러스",     nameEn:"LG Uplus",          ticker:"032640", market:"KOSPI", sector:"통신/5G",             currentPrice:10000,  marketCap:"7조" },
  { id:"017670", name:"SK텔레콤",       nameEn:"SK Telecom",        ticker:"017670", market:"KOSPI", sector:"통신/AI/데이터센터",  currentPrice:55000,  marketCap:"14조" },
  { id:"030200", name:"KT",             nameEn:"KT",                ticker:"030200", market:"KOSPI", sector:"통신/클라우드",       currentPrice:42000,  marketCap:"11조" },

  // ══════════════════════════════════════════════════════════════════════════
  // KOSPI ─ 자동차 / 부품
  // ══════════════════════════════════════════════════════════════════════════
  { id:"000270", name:"기아",           nameEn:"Kia",               ticker:"000270", market:"KOSPI", sector:"자동차/전기차",       currentPrice:87000,  marketCap:"35조" },
  { id:"012330", name:"현대모비스",     nameEn:"Hyundai Mobis",     ticker:"012330", market:"KOSPI", sector:"자동차부품/전장",     currentPrice:245000, marketCap:"23조" },
  { id:"086280", name:"현대글로비스",   nameEn:"Hyundai Glovis",    ticker:"086280", market:"KOSPI", sector:"물류/완성차운반",     currentPrice:180000, marketCap:"6조" },
  { id:"204320", name:"만도",           nameEn:"Mando",             ticker:"204320", market:"KOSPI", sector:"조향/제동/ADAS",      currentPrice:40000,  marketCap:"3조" },
  { id:"011210", name:"현대위아",       nameEn:"Hyundai Wia",       ticker:"011210", market:"KOSPI", sector:"자동차엔진/부품",     currentPrice:50000,  marketCap:"2조" },
  { id:"018880", name:"한온시스템",     nameEn:"Hanon Systems",     ticker:"018880", market:"KOSPI", sector:"자동차열관리",        currentPrice:7000,   marketCap:"3조" },
  { id:"161390", name:"한국타이어앤테크", nameEn:"Hankook Tire",    ticker:"161390", market:"KOSPI", sector:"타이어",              currentPrice:50000,  marketCap:"5조" },
  { id:"073240", name:"금호타이어",     nameEn:"Kumho Tire",        ticker:"073240", market:"KOSPI", sector:"타이어",              currentPrice:6000,   marketCap:"0.7조" },
  { id:"002350", name:"넥센타이어",     nameEn:"Nexen Tire",        ticker:"002350", market:"KOSPI", sector:"타이어",              currentPrice:8000,   marketCap:"0.8조" },
  { id:"241560", name:"두산밥캣",       nameEn:"Doosan Bobcat",     ticker:"241560", market:"KOSPI", sector:"소형건설장비",        currentPrice:40000,  marketCap:"3조" },
  { id:"267270", name:"HD현대",         nameEn:"HD Hyundai",        ticker:"267270", market:"KOSPI", sector:"지주/조선/에너지",    currentPrice:75000,  marketCap:"7조" },

  // ══════════════════════════════════════════════════════════════════════════
  // KOSPI ─ 조선 / 기계 / 방산
  // ══════════════════════════════════════════════════════════════════════════
  { id:"329180", name:"HD현대중공업",   nameEn:"HD Korea Shipbuilding",ticker:"329180",market:"KOSPI",sector:"조선/LNG선",         currentPrice:145000, marketCap:"5조" },
  { id:"042660", name:"한화오션",       nameEn:"Hanwha Ocean",      ticker:"042660", market:"KOSPI", sector:"조선/방산함정",       currentPrice:35000,  marketCap:"9조" },
  { id:"009540", name:"한국조선해양",   nameEn:"HD Korea Shipbuilding&Offshore",ticker:"009540",market:"KOSPI",sector:"조선지주",currentPrice:160000, marketCap:"6조" },
  { id:"010140", name:"삼성중공업",     nameEn:"Samsung Heavy Industries",ticker:"010140",market:"KOSPI",sector:"조선/해양플랜트",currentPrice:11000,  marketCap:"4조" },
  { id:"272210", name:"한화시스템",     nameEn:"Hanwha Systems",    ticker:"272210", market:"KOSPI", sector:"방산전자/위성",       currentPrice:22000,  marketCap:"3조" },
  { id:"047810", name:"한국항공우주",   nameEn:"Korea Aerospace Industries",ticker:"047810",market:"KOSPI",sector:"항공기/방산",  currentPrice:65000,  marketCap:"2조" },
  { id:"454910", name:"두산로보틱스",   nameEn:"Doosan Robotics",   ticker:"454910", market:"KOSPI", sector:"협동로봇",            currentPrice:50000,  marketCap:"4조" },
  { id:"267250_dup", name:"HD현대일렉트릭", nameEn:"HD Hyundai Electric",ticker:"267260",market:"KOSPI",sector:"전력변압기/전동기",currentPrice:280000,marketCap:"7조" },
  { id:"336260", name:"두산퓨얼셀",     nameEn:"Doosan Fuel Cell",  ticker:"336260", market:"KOSPI", sector:"수소연료전지",        currentPrice:15000,  marketCap:"2조" },
  { id:"267270_b",name:"HD현대마린솔루션",nameEn:"HD Hyundai Marine",ticker:"443060",market:"KOSPI", sector:"선박AS/디지털솔루션",currentPrice:80000,  marketCap:"2.5조" },

  // ══════════════════════════════════════════════════════════════════════════
  // KOSPI ─ 배터리 / 소재
  // ══════════════════════════════════════════════════════════════════════════
  { id:"373220", name:"LG에너지솔루션", nameEn:"LG Energy Solution",ticker:"373220", market:"KOSPI", sector:"전기차배터리",        currentPrice:340000, marketCap:"79조" },
  { id:"006400", name:"삼성SDI",        nameEn:"Samsung SDI",       ticker:"006400", market:"KOSPI", sector:"배터리/전자소재",     currentPrice:300000, marketCap:"20조" },
  { id:"051910", name:"LG화학",         nameEn:"LG Chem",           ticker:"051910", market:"KOSPI", sector:"배터리소재/화학",     currentPrice:280000, marketCap:"19조" },
  { id:"247540", name:"에코프로비엠",   nameEn:"EcoPro BM",         ticker:"247540", market:"KOSPI", sector:"양극재",              currentPrice:150000, marketCap:"12조" },
  { id:"086520", name:"에코프로",       nameEn:"EcoPro",            ticker:"086520", market:"KOSPI", sector:"배터리소재지주",      currentPrice:100000, marketCap:"7조" },
  { id:"003670", name:"포스코퓨처엠",   nameEn:"POSCO Future M",    ticker:"003670", market:"KOSPI", sector:"양극재/흑연음극재",   currentPrice:200000, marketCap:"16조" },
  { id:"005490", name:"POSCO홀딩스",    nameEn:"POSCO Holdings",    ticker:"005490", market:"KOSPI", sector:"철강/리튬/소재",      currentPrice:280000, marketCap:"24조" },
  { id:"004020", name:"현대제철",       nameEn:"Hyundai Steel",     ticker:"004020", market:"KOSPI", sector:"철강/고로",           currentPrice:30000,  marketCap:"5조" },
  { id:"010130", name:"고려아연",       nameEn:"Korea Zinc",        ticker:"010130", market:"KOSPI", sector:"비철금속/아연/인듐", currentPrice:600000, marketCap:"12조" },
  { id:"011780", name:"금호석유",       nameEn:"Kumho Petrochemical",ticker:"011780", market:"KOSPI", sector:"합성고무/수지",       currentPrice:140000, marketCap:"5조" },
  { id:"285130", name:"SK케미칼",       nameEn:"SK Chemicals",      ticker:"285130", market:"KOSPI", sector:"바이오소재/에코플라스틱",currentPrice:40000,marketCap:"1조" },
  { id:"004800", name:"효성",           nameEn:"Hyosung Corp",      ticker:"004800", market:"KOSPI", sector:"산업소재/지주",       currentPrice:40000,  marketCap:"2조" },
  { id:"120110", name:"코오롱인더",     nameEn:"Kolon Industries",  ticker:"120110", market:"KOSPI", sector:"산업용필름/에어백",   currentPrice:35000,  marketCap:"1조" },
  { id:"096770", name:"SK이노베이션",   nameEn:"SK Innovation",     ticker:"096770", market:"KOSPI", sector:"배터리/에너지",       currentPrice:130000, marketCap:"12조" },
  { id:"010950", name:"S-Oil",          nameEn:"S-Oil",             ticker:"010950", market:"KOSPI", sector:"정유/석유화학",       currentPrice:65000,  marketCap:"7조" },
  { id:"018670", name:"SK가스",         nameEn:"SK Gas",            ticker:"018670", market:"KOSPI", sector:"LPG/탄소중립",        currentPrice:120000, marketCap:"2조" },
  { id:"011790", name:"SKC",            nameEn:"SKC",               ticker:"011790", market:"KOSPI", sector:"동박/반도체소재",     currentPrice:70000,  marketCap:"2조" },
  { id:"001230", name:"동국제강",       nameEn:"Dongkuk Steel",     ticker:"001230", market:"KOSPI", sector:"전기로철강",          currentPrice:13000,  marketCap:"0.7조" },
  { id:"001570", name:"금양",           nameEn:"Geumyang",          ticker:"001570", market:"KOSPI", sector:"수소배터리소재",      currentPrice:45000,  marketCap:"1조" },

  // ══════════════════════════════════════════════════════════════════════════
  // KOSPI ─ 바이오 / 제약
  // ══════════════════════════════════════════════════════════════════════════
  { id:"207940", name:"삼성바이오로직스",nameEn:"Samsung Biologics", ticker:"207940", market:"KOSPI", sector:"바이오CDMO",          currentPrice:900000, marketCap:"129조" },
  { id:"068270", name:"셀트리온",       nameEn:"Celltrion",         ticker:"068270", market:"KOSPI", sector:"바이오시밀러",        currentPrice:185000, marketCap:"24조" },
  { id:"000100", name:"유한양행",       nameEn:"Yuhan Corp",        ticker:"000100", market:"KOSPI", sector:"제약/레이저티닙",     currentPrice:125000, marketCap:"4조" },
  { id:"128940", name:"한미약품",       nameEn:"Hanmi Pharm",       ticker:"128940", market:"KOSPI", sector:"제약/비만치료제",     currentPrice:380000, marketCap:"3조" },
  { id:"006280", name:"GC녹십자",       nameEn:"GC Biopharma",      ticker:"006280", market:"KOSPI", sector:"혈액제제/백신",       currentPrice:100000, marketCap:"1.5조" },
  { id:"185750", name:"종근당",         nameEn:"Chong Kun Dang",    ticker:"185750", market:"KOSPI", sector:"제약",               currentPrice:100000, marketCap:"2조" },
  { id:"170900", name:"동아ST",         nameEn:"Dong-A ST",         ticker:"170900", market:"KOSPI", sector:"제약/의약품",         currentPrice:50000,  marketCap:"1조" },
  { id:"003850", name:"보령",           nameEn:"Boryung",           ticker:"003850", market:"KOSPI", sector:"제약",               currentPrice:12000,  marketCap:"0.7조" },
  { id:"069620", name:"대웅제약",       nameEn:"Daewoong Pharm",    ticker:"069620", market:"KOSPI", sector:"제약/보톡스원료",     currentPrice:105000, marketCap:"1조" },
  { id:"145020", name:"휴젤",           nameEn:"Hugel",             ticker:"145020", market:"KOSPI", sector:"보톡스/필러",         currentPrice:280000, marketCap:"2조" },
  { id:"302440", name:"SK바이오사이언스",nameEn:"SK Bioscience",    ticker:"302440", market:"KOSPI", sector:"백신CDMO",            currentPrice:55000,  marketCap:"2조" },
  { id:"326030", name:"SK바이오팜",     nameEn:"SK Biopharmaceuticals",ticker:"326030",market:"KOSPI",sector:"뇌전증신약",        currentPrice:80000,  marketCap:"4조" },
  { id:"002390", name:"한독",           nameEn:"Handok",            ticker:"002390", market:"KOSPI", sector:"제약",               currentPrice:15000,  marketCap:"0.4조" },
  { id:"000230", name:"일동제약",       nameEn:"Ildong Pharm",      ticker:"000230", market:"KOSPI", sector:"제약",               currentPrice:15000,  marketCap:"0.3조" },
  { id:"008930", name:"한미사이언스",   nameEn:"Hanmi Science",     ticker:"008930", market:"KOSPI", sector:"제약지주",           currentPrice:50000,  marketCap:"1조" },

  // ══════════════════════════════════════════════════════════════════════════
  // KOSPI ─ 금융 / 보험 / 증권
  // ══════════════════════════════════════════════════════════════════════════
  { id:"105560", name:"KB금융",         nameEn:"KB Financial",      ticker:"105560", market:"KOSPI", sector:"금융지주/은행",       currentPrice:88000,  marketCap:"37조" },
  { id:"055550", name:"신한금융지주",   nameEn:"Shinhan Financial",  ticker:"055550", market:"KOSPI", sector:"금융지주/은행",       currentPrice:58000,  marketCap:"28조" },
  { id:"086790", name:"하나금융지주",   nameEn:"Hana Financial",    ticker:"086790", market:"KOSPI", sector:"금융지주/은행",       currentPrice:68000,  marketCap:"20조" },
  { id:"316140", name:"우리금융지주",   nameEn:"Woori Financial",   ticker:"316140", market:"KOSPI", sector:"금융지주/은행",       currentPrice:16500,  marketCap:"13조" },
  { id:"138040", name:"메리츠금융지주", nameEn:"Meritz Financial",  ticker:"138040", market:"KOSPI", sector:"금융지주/증권/화재",  currentPrice:90000,  marketCap:"21조" },
  { id:"006800", name:"미래에셋증권",   nameEn:"Mirae Asset Securities",ticker:"006800",market:"KOSPI",sector:"증권/자산운용",     currentPrice:10000,  marketCap:"8조" },
  { id:"005940", name:"NH투자증권",     nameEn:"NH Investment Securities",ticker:"005940",market:"KOSPI",sector:"증권/IB",       currentPrice:14000,  marketCap:"5조" },
  { id:"016360", name:"삼성증권",       nameEn:"Samsung Securities",ticker:"016360", market:"KOSPI", sector:"증권/자산운용",      currentPrice:45000,  marketCap:"5조" },
  { id:"071050", name:"한국금융지주",   nameEn:"Korea Investment Holdings",ticker:"071050",market:"KOSPI",sector:"증권/자산운용", currentPrice:90000,  marketCap:"7조" },
  { id:"039490", name:"키움증권",       nameEn:"Kiwoom Securities",  ticker:"039490", market:"KOSPI", sector:"리테일증권/MTS",     currentPrice:120000, marketCap:"5조" },
  { id:"032830", name:"삼성생명",       nameEn:"Samsung Life Insurance",ticker:"032830",market:"KOSPI",sector:"생명보험",         currentPrice:78000,  marketCap:"15조" },
  { id:"000810", name:"삼성화재",       nameEn:"Samsung Fire & Marine",ticker:"000810",market:"KOSPI",sector:"손해보험",          currentPrice:330000, marketCap:"14조" },
  { id:"005830", name:"DB손해보험",     nameEn:"DB Insurance",      ticker:"005830", market:"KOSPI", sector:"손해보험",           currentPrice:100000, marketCap:"9조" },
  { id:"001450", name:"현대해상",       nameEn:"Hyundai Marine & Fire",ticker:"001450",market:"KOSPI",sector:"손해보험",          currentPrice:35000,  marketCap:"4조" },
  { id:"000060", name:"메리츠화재",     nameEn:"Meritz Fire & Marine",ticker:"000060",market:"KOSPI",sector:"손해보험",           currentPrice:90000,  marketCap:"8조" },
  { id:"088350", name:"한화생명",       nameEn:"Hanwha Life",       ticker:"088350", market:"KOSPI", sector:"생명보험",           currentPrice:3500,   marketCap:"3조" },

  // ══════════════════════════════════════════════════════════════════════════
  // KOSPI ─ 유통 / 소비 / 식품 / 패션
  // ══════════════════════════════════════════════════════════════════════════
  { id:"023530", name:"롯데쇼핑",       nameEn:"Lotte Shopping",    ticker:"023530", market:"KOSPI", sector:"백화점/마트/이커머스",currentPrice:70000,  marketCap:"2조" },
  { id:"139480", name:"이마트",         nameEn:"E-Mart",            ticker:"139480", market:"KOSPI", sector:"대형마트/SSG",        currentPrice:60000,  marketCap:"2조" },
  { id:"004170", name:"신세계",         nameEn:"Shinsegae",         ticker:"004170", market:"KOSPI", sector:"백화점/면세점",       currentPrice:160000, marketCap:"2조" },
  { id:"007070", name:"GS리테일",       nameEn:"GS Retail",         ticker:"007070", market:"KOSPI", sector:"편의점GS25/슈퍼",    currentPrice:25000,  marketCap:"2조" },
  { id:"069960", name:"현대백화점",     nameEn:"Hyundai Department", ticker:"069960", market:"KOSPI", sector:"백화점",             currentPrice:60000,  marketCap:"1.5조" },
  { id:"282330", name:"BGF리테일",      nameEn:"BGF Retail",        ticker:"282330", market:"KOSPI", sector:"편의점CU",            currentPrice:190000, marketCap:"3조" },
  { id:"271560", name:"오리온",         nameEn:"Orion",             ticker:"271560", market:"KOSPI", sector:"과자/스낵/중국사업",  currentPrice:120000, marketCap:"4조" },
  { id:"004370", name:"농심",           nameEn:"Nongshim",          ticker:"004370", market:"KOSPI", sector:"라면/스낵",           currentPrice:430000, marketCap:"3조" },
  { id:"003230", name:"삼양식품",       nameEn:"Samyang Foods",     ticker:"003230", market:"KOSPI", sector:"불닭볶음면/K푸드",    currentPrice:800000, marketCap:"6조" },
  { id:"007310", name:"오뚜기",         nameEn:"Ottogi",            ticker:"007310", market:"KOSPI", sector:"식품",               currentPrice:550000, marketCap:"2조" },
  { id:"017810", name:"풀무원",         nameEn:"Pulmuone",          ticker:"017810", market:"KOSPI", sector:"식품/두부/건강식",    currentPrice:12000,  marketCap:"0.6조" },
  { id:"005180", name:"빙그레",         nameEn:"Binggrae",          ticker:"005180", market:"KOSPI", sector:"유제품/아이스크림",   currentPrice:70000,  marketCap:"1조" },
  { id:"000080", name:"하이트진로",     nameEn:"Hite Jinro",        ticker:"000080", market:"KOSPI", sector:"맥주/소주",           currentPrice:22000,  marketCap:"2조" },
  { id:"001040", name:"CJ",             nameEn:"CJ Corp",           ticker:"001040", market:"KOSPI", sector:"식품/엔터/물류지주",  currentPrice:95000,  marketCap:"3조" },
  { id:"090430", name:"아모레퍼시픽",   nameEn:"Amorepacific",      ticker:"090430", market:"KOSPI", sector:"화장품/K뷰티",        currentPrice:100000, marketCap:"6조" },
  { id:"051900", name:"LG생활건강",     nameEn:"LG H&H",            ticker:"051900", market:"KOSPI", sector:"화장품/생활용품",     currentPrice:380000, marketCap:"6조" },
  { id:"192820", name:"코스맥스",       nameEn:"Cosmax",            ticker:"192820", market:"KOSPI", sector:"화장품ODM",           currentPrice:120000, marketCap:"2조" },
  { id:"161890", name:"한국콜마",       nameEn:"Kolmar Korea",      ticker:"161890", market:"KOSPI", sector:"화장품ODM",           currentPrice:50000,  marketCap:"1.5조" },
  { id:"383220", name:"F&F",            nameEn:"F&F",               ticker:"383220", market:"KOSPI", sector:"MLB/디스커버리패션",  currentPrice:130000, marketCap:"3조" },
  { id:"020000", name:"한섬",           nameEn:"Handsome",          ticker:"020000", market:"KOSPI", sector:"패션/의류",           currentPrice:35000,  marketCap:"0.6조" },
  { id:"081660", name:"휠라홀딩스",     nameEn:"Fila Holdings",     ticker:"081660", market:"KOSPI", sector:"스포츠브랜드",        currentPrice:25000,  marketCap:"1조" },

  // ══════════════════════════════════════════════════════════════════════════
  // KOSPI ─ 에너지 / 건설 / 인프라
  // ══════════════════════════════════════════════════════════════════════════
  { id:"015760", name:"한국전력",       nameEn:"KEPCO",             ticker:"015760", market:"KOSPI", sector:"전력/유틸리티",       currentPrice:20000,  marketCap:"13조" },
  { id:"036460", name:"한국가스공사",   nameEn:"Korea Gas Corp",    ticker:"036460", market:"KOSPI", sector:"LNG/수소에너지",      currentPrice:25000,  marketCap:"2조" },
  { id:"009830", name:"한화솔루션",     nameEn:"Hanwha Solutions",  ticker:"009830", market:"KOSPI", sector:"태양광/PVC화학",      currentPrice:28000,  marketCap:"4조" },
  { id:"011170", name:"롯데케미칼",     nameEn:"Lotte Chemical",    ticker:"011170", market:"KOSPI", sector:"석유화학",            currentPrice:85000,  marketCap:"3조" },
  { id:"010060", name:"OCI홀딩스",      nameEn:"OCI Holdings",      ticker:"010060", market:"KOSPI", sector:"폴리실리콘/태양광",   currentPrice:55000,  marketCap:"1조" },
  { id:"028260", name:"삼성물산",       nameEn:"Samsung C&T",       ticker:"028260", market:"KOSPI", sector:"건설/패션/리조트",    currentPrice:165000, marketCap:"30조" },
  { id:"000720", name:"현대건설",       nameEn:"Hyundai E&C",       ticker:"000720", market:"KOSPI", sector:"건설/플랜트",         currentPrice:27000,  marketCap:"3조" },
  { id:"006360", name:"GS건설",         nameEn:"GS Engineering",    ticker:"006360", market:"KOSPI", sector:"건설",               currentPrice:17000,  marketCap:"1조" },
  { id:"047040", name:"대우건설",       nameEn:"Daewoo E&C",        ticker:"047040", market:"KOSPI", sector:"건설/해외플랜트",     currentPrice:5000,   marketCap:"2조" },
  { id:"028050", name:"삼성엔지니어링", nameEn:"Samsung Engineering",ticker:"028050", market:"KOSPI", sector:"화공플랜트/EPC",      currentPrice:25000,  marketCap:"2조" },
  { id:"078930", name:"GS",             nameEn:"GS Holdings",       ticker:"078930", market:"KOSPI", sector:"에너지/유통/건설지주",currentPrice:42000,  marketCap:"3조" },
  { id:"034730", name:"SK",             nameEn:"SK Inc",            ticker:"034730", market:"KOSPI", sector:"에너지/ICT/바이오지주",currentPrice:180000,marketCap:"13조" },
  { id:"003550", name:"LG",             nameEn:"LG Corp",           ticker:"003550", market:"KOSPI", sector:"전자/화학/통신지주",  currentPrice:85000,  marketCap:"14조" },
  { id:"000880", name:"한화",           nameEn:"Hanwha Group",      ticker:"000880", market:"KOSPI", sector:"방산/화학/금융지주",  currentPrice:35000,  marketCap:"2조" },
  { id:"006260", name:"LS",             nameEn:"LS Corp",           ticker:"006260", market:"KOSPI", sector:"전선/전력인프라",     currentPrice:120000, marketCap:"3조" },
  { id:"010120", name:"LS ELECTRIC",    nameEn:"LS Electric",       ticker:"010120", market:"KOSPI", sector:"전력기기/ESS",        currentPrice:170000, marketCap:"3조" },
  { id:"000150", name:"두산",           nameEn:"Doosan Corp",       ticker:"000150", market:"KOSPI", sector:"지주/중공업",         currentPrice:210000, marketCap:"3조" },
  { id:"011200", name:"HMM",            nameEn:"HMM",               ticker:"011200", market:"KOSPI", sector:"컨테이너해운",        currentPrice:17000,  marketCap:"4조" },
  { id:"028670", name:"팬오션",         nameEn:"Pan Ocean",         ticker:"028670", market:"KOSPI", sector:"벌크해운",            currentPrice:7500,   marketCap:"2조" },
  { id:"003490", name:"대한항공",       nameEn:"Korean Air",        ticker:"003490", market:"KOSPI", sector:"항공/여객",           currentPrice:25000,  marketCap:"5조" },
  { id:"180640", name:"한진칼",         nameEn:"Hanjin KAL",        ticker:"180640", market:"KOSPI", sector:"항공지주",            currentPrice:68000,  marketCap:"3조" },
  { id:"272450", name:"진에어",         nameEn:"Jin Air",           ticker:"272450", market:"KOSPI", sector:"저비용항공",          currentPrice:12000,  marketCap:"1조" },
  { id:"091810", name:"티웨이항공",     nameEn:"T'way Air",         ticker:"091810", market:"KOSPI", sector:"저비용항공",          currentPrice:3000,   marketCap:"0.5조" },
  { id:"000120", name:"CJ대한통운",     nameEn:"CJ Logistics",      ticker:"000120", market:"KOSPI", sector:"물류/택배",           currentPrice:130000, marketCap:"3조" },
  { id:"002320", name:"한진",           nameEn:"Hanjin",            ticker:"002320", market:"KOSPI", sector:"물류/택배",           currentPrice:30000,  marketCap:"0.6조" },

  // ══════════════════════════════════════════════════════════════════════════
  // KOSPI ─ 호텔 / 엔터 / 기타
  // ══════════════════════════════════════════════════════════════════════════
  { id:"008770", name:"호텔신라",       nameEn:"Hotel Shilla",      ticker:"008770", market:"KOSPI", sector:"호텔/면세점",         currentPrice:60000,  marketCap:"2조" },
  { id:"035250", name:"강원랜드",       nameEn:"Kangwon Land",      ticker:"035250", market:"KOSPI", sector:"카지노/리조트",       currentPrice:15000,  marketCap:"4조" },
  { id:"034230", name:"파라다이스",     nameEn:"Paradise Co",       ticker:"034230", market:"KOSPI", sector:"외국인카지노",        currentPrice:12000,  marketCap:"1조" },
  { id:"114090", name:"GKL",            nameEn:"Grand Korea Leisure",ticker:"114090", market:"KOSPI", sector:"외국인카지노",       currentPrice:15000,  marketCap:"1조" },
  { id:"030000", name:"제일기획",       nameEn:"Cheil Worldwide",   ticker:"030000", market:"KOSPI", sector:"광고/마케팅",         currentPrice:17000,  marketCap:"1.2조" },
  { id:"033780", name:"KT&G",           nameEn:"KT&G",              ticker:"033780", market:"KOSPI", sector:"담배/부동산/바이오",  currentPrice:105000, marketCap:"11조" },
  { id:"021240", name:"코웨이",         nameEn:"Coway",             ticker:"021240", market:"KOSPI", sector:"정수기/공기청정기",   currentPrice:70000,  marketCap:"5조" },
  { id:"097950", name:"CJ제일제당",     nameEn:"CJ CheilJedang",    ticker:"097950", market:"KOSPI", sector:"식품/바이오/사료",    currentPrice:245000, marketCap:"5조" },

  // ══════════════════════════════════════════════════════════════════════════
  // KOSDAQ ─ 바이오 / 제약
  // ══════════════════════════════════════════════════════════════════════════
  { id:"032820_skip", name:"우리기술투자", nameEn:"Woori Tech Inv",  ticker:"032820", market:"KOSDAQ", sector:"원전/소형주",       currentPrice:24450,  marketCap:"0.3조" },
  { id:"196170", name:"알테오젠",       nameEn:"Alteogen",          ticker:"196170", market:"KOSDAQ", sector:"피하주사플랫폼/바이오",currentPrice:200000,marketCap:"12조" },
  { id:"028300", name:"HLB",            nameEn:"HLB",               ticker:"028300", market:"KOSDAQ", sector:"항암신약/리보세라닙",currentPrice:30000,  marketCap:"2조" },
  { id:"068760", name:"셀트리온제약",   nameEn:"Celltrion Pharm",   ticker:"068760", market:"KOSDAQ", sector:"바이오시밀러판매",  currentPrice:85000,  marketCap:"5조" },
  { id:"091990", name:"셀트리온헬스케어", nameEn:"Celltrion HC",   ticker:"091990", market:"KOSDAQ", sector:"바이오시밀러유통",  currentPrice:70000,  marketCap:"4조" },
  { id:"237690", name:"에스티팜",       nameEn:"ST Pharm",          ticker:"237690", market:"KOSDAQ", sector:"mRNA CDMO/원료의약품",currentPrice:80000, marketCap:"1조" },
  { id:"328130", name:"루닛",           nameEn:"Lunit",             ticker:"328130", market:"KOSDAQ", sector:"AI영상진단/디지털병리",currentPrice:60000,marketCap:"1조" },
  { id:"950160", name:"코오롱티슈진",   nameEn:"Kolon TissueGene",  ticker:"950160", market:"KOSDAQ", sector:"세포유전자치료제",  currentPrice:35000,  marketCap:"0.5조" },
  { id:"214150", name:"클래시스",       nameEn:"Classys",           ticker:"214150", market:"KOSDAQ", sector:"의료미용기기/하이푸", currentPrice:40000, marketCap:"0.7조" },
  { id:"060280", name:"큐렉소",         nameEn:"Curexo",            ticker:"060280", market:"KOSDAQ", sector:"정형외과수술로봇",  currentPrice:30000,  marketCap:"0.3조" },
  { id:"048260", name:"오스템임플란트", nameEn:"Osstem Implant",    ticker:"048260", market:"KOSDAQ", sector:"임플란트/치과기자재",currentPrice:190000,marketCap:"2조" },
  { id:"145720", name:"덴티움",         nameEn:"Dentium",           ticker:"145720", market:"KOSDAQ", sector:"임플란트",          currentPrice:50000,  marketCap:"0.5조" },
  { id:"096530", name:"씨젠",           nameEn:"Seegene",           ticker:"096530", market:"KOSDAQ", sector:"분자진단키트",      currentPrice:25000,  marketCap:"0.5조" },
  { id:"141080", name:"리가켐바이오",   nameEn:"LegaChem Bio",      ticker:"141080", market:"KOSDAQ", sector:"항체약물접합/ADC",  currentPrice:80000,  marketCap:"2조" },
  { id:"950130", name:"엑스게이트",     nameEn:"Xgate",             ticker:"950130", market:"KOSDAQ", sector:"네트워크보안",      currentPrice:15000,  marketCap:"0.2조" },
  { id:"307280", name:"원바이오젠",     nameEn:"1Biogen",           ticker:"307280", market:"KOSDAQ", sector:"바이오",            currentPrice:5000,   marketCap:"0.1조" },
  { id:"086900", name:"메디톡스",       nameEn:"Medytox",           ticker:"086900", market:"KOSDAQ", sector:"보툴리눔톡신/바이오",currentPrice:150000,marketCap:"1조" },
  { id:"214610", name:"파마리서치",     nameEn:"Pharma Research",   ticker:"214610", market:"KOSDAQ", sector:"피부재생의료기기",  currentPrice:120000, marketCap:"0.5조" },
  { id:"078940", name:"코드씨",         nameEn:"CodeC",             ticker:"078940", market:"KOSDAQ", sector:"바이오",            currentPrice:5000,   marketCap:"0.1조" },
  { id:"206640", name:"바디텍메드",     nameEn:"Boditech Med",      ticker:"206640", market:"KOSDAQ", sector:"체외진단기기",      currentPrice:15000,  marketCap:"0.2조" },
  { id:"044180", name:"피씨엘",         nameEn:"PCL",               ticker:"044180", market:"KOSDAQ", sector:"체외진단",          currentPrice:4000,   marketCap:"0.1조" },
  { id:"014620", name:"성광벤드",       nameEn:"Sungkwang Bend",    ticker:"014620", market:"KOSDAQ", sector:"배관부품/원전",     currentPrice:40000,  marketCap:"0.5조" },
  { id:"101000", name:"상보",           nameEn:"Sangbo",            ticker:"101000", market:"KOSDAQ", sector:"디스플레이소재",    currentPrice:5000,   marketCap:"0.1조" },

  // ══════════════════════════════════════════════════════════════════════════
  // KOSDAQ ─ 반도체 / 소재 / 장비
  // ══════════════════════════════════════════════════════════════════════════
  { id:"357780", name:"솔브레인",       nameEn:"Soulbrain",         ticker:"357780", market:"KOSDAQ", sector:"반도체세정액/소재",  currentPrice:280000, marketCap:"3조" },
  { id:"058470", name:"리노공업",       nameEn:"Leeno Industrial",  ticker:"058470", market:"KOSDAQ", sector:"반도체테스트소켓",  currentPrice:180000, marketCap:"3조" },
  { id:"240810", name:"원익IPS",        nameEn:"Wonik IPS",         ticker:"240810", market:"KOSDAQ", sector:"CVD/반도체장비",    currentPrice:30000,  marketCap:"1조" },
  { id:"140660", name:"파크시스템스",   nameEn:"Park Systems",      ticker:"140660", market:"KOSDAQ", sector:"원자현미경(AFM)",   currentPrice:180000, marketCap:"2조" },
  { id:"039030", name:"이오테크닉스",   nameEn:"EO Technics",       ticker:"039030", market:"KOSDAQ", sector:"레이저가공장비",    currentPrice:180000, marketCap:"1조" },
  { id:"137310", name:"에스에프에이",   nameEn:"SFA Engineering",   ticker:"137310", market:"KOSDAQ", sector:"디스플레이/2차전지장비",currentPrice:38000,marketCap:"0.5조" },
  { id:"108670", name:"LB세미콘",       nameEn:"LB Semicon",        ticker:"108670", market:"KOSDAQ", sector:"반도체후공정",      currentPrice:28000,  marketCap:"0.5조" },
  { id:"450080", name:"에코프로머티리얼즈", nameEn:"EcoPro Materials",ticker:"450080",market:"KOSDAQ",sector:"배터리전구체",      currentPrice:100000, marketCap:"7조" },
  { id:"121600", name:"나노신소재",     nameEn:"Nano New Material", ticker:"121600", market:"KOSDAQ", sector:"탄소나노튜브/배터리도전재",currentPrice:60000,marketCap:"1조" },
  { id:"005290", name:"동진쎄미켐",     nameEn:"Dongjin Semichem",  ticker:"005290", market:"KOSDAQ", sector:"반도체/디스플레이소재",currentPrice:30000,marketCap:"0.8조" },
  { id:"131970", name:"두산테스나",     nameEn:"Doosan Tesna",      ticker:"131970", market:"KOSDAQ", sector:"반도체테스트",      currentPrice:35000,  marketCap:"0.5조" },
  { id:"319660", name:"피에스케이",     nameEn:"PSK",               ticker:"319660", market:"KOSDAQ", sector:"반도체식각/세정장비",currentPrice:35000, marketCap:"0.8조" },
  { id:"036540", name:"SFA반도체",      nameEn:"SFA Semiconductor", ticker:"036540", market:"KOSDAQ", sector:"반도체패키징",      currentPrice:7000,   marketCap:"0.5조" },
  { id:"039440", name:"에스에이치엘",   nameEn:"SHL",               ticker:"039440", market:"KOSDAQ", sector:"반도체장비부품",    currentPrice:20000,  marketCap:"0.1조" },
  { id:"277810", name:"레인보우로보틱스", nameEn:"Rainbow Robotics", ticker:"277810", market:"KOSDAQ", sector:"협동로봇/로봇AI",   currentPrice:180000, marketCap:"2조" },
  { id:"112610", name:"씨에스윈드",     nameEn:"CS Wind",           ticker:"112610", market:"KOSDAQ", sector:"풍력타워",          currentPrice:60000,  marketCap:"2조" },
  { id:"022100", name:"포스코DX",       nameEn:"POSCO DX",          ticker:"022100", market:"KOSDAQ", sector:"스마트팩토리/DX",   currentPrice:20000,  marketCap:"2조" },
  { id:"012510", name:"더존비즈온",     nameEn:"Douzone Bizon",     ticker:"012510", market:"KOSDAQ", sector:"ERP/클라우드",      currentPrice:50000,  marketCap:"3조" },
  { id:"076080", name:"유비쿼스",       nameEn:"Ubiquoss",          ticker:"076080", market:"KOSDAQ", sector:"기업네트워크장비",  currentPrice:15000,  marketCap:"0.3조" },
  { id:"178320", name:"서진시스템",     nameEn:"Seonjin System",    ticker:"178320", market:"KOSDAQ", sector:"ESS/통신장비모듈",  currentPrice:25000,  marketCap:"0.5조" },
  { id:"394280", name:"오픈엣지테크놀로지", nameEn:"OpenEdge Technology",ticker:"394280",market:"KOSDAQ",sector:"AI반도체/NPU IP",currentPrice:30000, marketCap:"0.5조" },
  { id:"085370", name:"루트로닉",       nameEn:"Lutronic",          ticker:"085370", market:"KOSDAQ", sector:"레이저의료기기",    currentPrice:30000,  marketCap:"0.4조" },

  // ══════════════════════════════════════════════════════════════════════════
  // KOSDAQ ─ 게임 / 엔터 / 미디어
  // ══════════════════════════════════════════════════════════════════════════
  { id:"293490", name:"카카오게임즈",   nameEn:"Kakao Games",       ticker:"293490", market:"KOSDAQ", sector:"모바일PC게임",      currentPrice:20000,  marketCap:"0.9조" },
  { id:"112040", name:"위메이드",       nameEn:"Wemade",            ticker:"112040", market:"KOSDAQ", sector:"P2E게임/블록체인",  currentPrice:35000,  marketCap:"0.6조" },
  { id:"263750", name:"펄어비스",       nameEn:"Pearl Abyss",       ticker:"263750", market:"KOSDAQ", sector:"검은사막/붉은사막", currentPrice:30000,  marketCap:"0.7조" },
  { id:"036570", name:"엔씨소프트",     nameEn:"NCSoft",            ticker:"036570", market:"KOSDAQ", sector:"리니지/NC우주",     currentPrice:155000, marketCap:"3조" },
  { id:"251270", name:"넷마블",         nameEn:"Netmarble",         ticker:"251270", market:"KOSDAQ", sector:"모바일게임",        currentPrice:45000,  marketCap:"1조" },
  { id:"041510", name:"에스엠",         nameEn:"SM Entertainment",  ticker:"041510", market:"KOSDAQ", sector:"K-POP/아이돌",     currentPrice:80000,  marketCap:"1조" },
  { id:"352820", name:"하이브",         nameEn:"HYBE",              ticker:"352820", market:"KOSDAQ", sector:"BTS/K-POP콘텐츠",  currentPrice:185000, marketCap:"4조" },
  { id:"035900", name:"JYP엔터",        nameEn:"JYP Entertainment", ticker:"035900", market:"KOSDAQ", sector:"트와이스/스트레이키즈",currentPrice:55000, marketCap:"0.9조" },
  { id:"122870", name:"와이지엔터테인먼트", nameEn:"YG Entertainment",ticker:"122870",market:"KOSDAQ",sector:"블랙핑크/빅뱅",    currentPrice:40000,  marketCap:"0.6조" },
  { id:"253450", name:"스튜디오드래곤", nameEn:"Studio Dragon",     ticker:"253450", market:"KOSDAQ", sector:"드라마제작/콘텐츠", currentPrice:60000,  marketCap:"1조" },
  { id:"041960", name:"코미팜",         nameEn:"Komipharm",         ticker:"041960", market:"KOSDAQ", sector:"동물/인체의약품",   currentPrice:10000,  marketCap:"0.2조" },
  { id:"214320", name:"이노션",         nameEn:"Innocean",          ticker:"214320", market:"KOSDAQ", sector:"광고대행",          currentPrice:40000,  marketCap:"0.8조" },
  { id:"445680", name:"시프트업",       nameEn:"Shift Up",          ticker:"445680", market:"KOSDAQ", sector:"니케/스텔라블레이드",currentPrice:50000, marketCap:"2조" },

  // ══════════════════════════════════════════════════════════════════════════
  // KOSDAQ ─ 배터리소재 / 에너지전환 / 로봇
  // ══════════════════════════════════════════════════════════════════════════
  { id:"357240", name:"에이피알",       nameEn:"APR",               ticker:"357240", market:"KOSDAQ", sector:"K뷰티/에이피알",    currentPrice:350000, marketCap:"1조" },
  { id:"215200", name:"메가스터디교육", nameEn:"Megastudy Education",ticker:"215200", market:"KOSDAQ", sector:"온라인교육",        currentPrice:35000,  marketCap:"0.5조" },
  { id:"089590", name:"제주항공",       nameEn:"Jeju Air",          ticker:"089590", market:"KOSDAQ", sector:"저비용항공LCC",     currentPrice:9500,   marketCap:"0.8조" },
  { id:"109820", name:"진원생명과학",   nameEn:"Jinwon Bioscience", ticker:"109820", market:"KOSDAQ", sector:"mRNA/백신원료",     currentPrice:20000,  marketCap:"0.4조" },
  { id:"336570", name:"원텍",           nameEn:"Wontech",           ticker:"336570", market:"KOSDAQ", sector:"의료미용레이저",    currentPrice:15000,  marketCap:"0.3조" },
  { id:"257720", name:"실리콘투",       nameEn:"Silicon2",          ticker:"257720", market:"KOSDAQ", sector:"K뷰티수출/플랫폼",  currentPrice:30000,  marketCap:"0.8조" },
  { id:"310210", name:"보로노이",       nameEn:"Voronoi",           ticker:"310210", market:"KOSDAQ", sector:"면역항암신약",      currentPrice:30000,  marketCap:"0.4조" },
  { id:"196300", name:"애경산업",       nameEn:"AK Holdings",       ticker:"196300", market:"KOSDAQ", sector:"생활용품/화장품",   currentPrice:20000,  marketCap:"0.3조" },
  { id:"298380", name:"에이비엘바이오", nameEn:"ABL Bio",           ticker:"298380", market:"KOSDAQ", sector:"이중항체플랫폼바이오",currentPrice:20000, marketCap:"0.5조" },
];

// ─────────────────────────────────────────────────────────────────────────────
// 밸류에이션 데이터 (PER / PBR)
// per: null = 적자 기업, pbr: 주가순자산비율
// 기준일: 2026년 3월 (추정치 포함)
// ─────────────────────────────────────────────────────────────────────────────
export interface ValuationData { per: number | null; pbr: number }

export const VALUATION_MAP: Record<string, ValuationData> = {
  // ── NASDAQ: 메가캡 / AI / 반도체 ──────────────────────────────────────────
  "nvda_skip":  { per: 40,  pbr: 38  }, "googl_skip": { per: 22,  pbr: 6   },
  "goog":       { per: 22,  pbr: 6   }, "orcl_skip":  { per: 24,  pbr: 18  },
  "ionq_skip":  { per: null,pbr: 4   }, "sndk_skip":  { per: 18,  pbr: 2   },
  "eonr_skip":  { per: null,pbr: 3   }, "aapl":       { per: 30,  pbr: 40  },
  "msft":       { per: 32,  pbr: 12  }, "amzn":       { per: 38,  pbr: 8   },
  "meta":       { per: 26,  pbr: 8   }, "tsla":       { per: 100, pbr: 12  },
  "amd":        { per: 95,  pbr: 4   }, "intc":       { per: 25,  pbr: 1.1 },
  "qcom":       { per: 14,  pbr: 5   }, "avgo":       { per: 35,  pbr: 10  },
  "mu":         { per: 18,  pbr: 2.5 }, "arm":        { per: 80,  pbr: 25  },
  "amat":       { per: 20,  pbr: 6   }, "lrcx":       { per: 22,  pbr: 9   },
  "klac":       { per: 24,  pbr: 15  }, "asml":       { per: 35,  pbr: 15  },
  "tsm":        { per: 22,  pbr: 7   }, "mrvl":       { per: 55,  pbr: 4   },
  "txn":        { per: 30,  pbr: 9   }, "mpwr":       { per: 45,  pbr: 10  },
  "mchp":       { per: 20,  pbr: 3   }, "swks":       { per: 14,  pbr: 2.5 },
  "on":         { per: 18,  pbr: 2   }, "wolf":       { per: null,pbr: 0.8 },
  "nxpi":       { per: 17,  pbr: 3.5 }, "qrvo":       { per: 22,  pbr: 2   },
  "entg":       { per: 35,  pbr: 3   }, "mksi":       { per: 25,  pbr: 1.5 },
  "acls":       { per: 11,  pbr: 1.5 }, "amkr":       { per: 12,  pbr: 1.2 },
  "form":       { per: 25,  pbr: 2   }, "ipgp":       { per: 30,  pbr: 1.5 },
  "onto":       { per: 18,  pbr: 2   }, "algm":       { per: 30,  pbr: 2.5 },
  "mtsi":       { per: 35,  pbr: 5   }, "crus":       { per: 18,  pbr: 2   },
  "amba":       { per: 80,  pbr: 3   }, "slab":       { per: 40,  pbr: 2.5 },
  "uctt":       { per: 15,  pbr: 1.2 }, "diod":       { per: 15,  pbr: 1.2 },
  "lazr":       { per: null,pbr: 2   },
  // ── NASDAQ: SaaS / 클라우드 ──────────────────────────────────────────────
  "nflx":       { per: 40,  pbr: 15  }, "crm":        { per: 40,  pbr: 6   },
  "adbe":       { per: 25,  pbr: 11  }, "now":        { per: 60,  pbr: 18  },
  "intu":       { per: 45,  pbr: 12  }, "cdns":       { per: 55,  pbr: 15  },
  "snps":       { per: 50,  pbr: 12  }, "anss":       { per: 45,  pbr: 8   },
  "manh":       { per: 70,  pbr: 25  }, "wday":       { per: 45,  pbr: 8   },
  "hubs":       { per: null,pbr: 12  }, "ddog":       { per: 200, pbr: 20  },
  "snow":       { per: null,pbr: 8   }, "mdb":        { per: null,pbr: 7   },
  "crwd":       { per: 80,  pbr: 25  }, "panw":       { per: 50,  pbr: 17  },
  "ftnt":       { per: 35,  pbr: 25  }, "zs":         { per: null,pbr: 10  },
  "net":        { per: null,pbr: 18  }, "team":       { per: 100, pbr: 20  },
  "okta":       { per: null,pbr: 5   }, "twlo":       { per: null,pbr: 2   },
  "bill":       { per: null,pbr: 4   }, "pltr":       { per: 150, pbr: 20  },
  "smci":       { per: 12,  pbr: 1.5 }, "zi":         { per: null,pbr: 3   },
  "mndy":       { per: null,pbr: 12  }, "cflt":       { per: null,pbr: 5   },
  "pcor":       { per: null,pbr: 8   }, "asan":       { per: null,pbr: 4   },
  "brze":       { per: null,pbr: 5   }, "smar":       { per: null,pbr: 6   },
  "wix":        { per: 30,  pbr: 10  }, "domo":       { per: null,pbr: 2   },
  "ncno":       { per: null,pbr: 4   }, "tost":       { per: 40,  pbr: 8   },
  "vrsk":       { per: 38,  pbr: 12  }, "ctsh":       { per: 14,  pbr: 2.5 },
  "cdw":        { per: 16,  pbr: 8   }, "cprt":       { per: 35,  pbr: 9   },
  "payx":       { per: 28,  pbr: 9   }, "csco":       { per: 16,  pbr: 4.5 },
  "adp":        { per: 28,  pbr: 10  }, "ibm":        { per: 22,  pbr: 7   },
  "hpe":        { per: 11,  pbr: 1.8 }, "dell":       { per: 16,  pbr: 6   },
  "vrt":        { per: 55,  pbr: 10  }, "ndaq":       { per: 30,  pbr: 5   },
  // ── NASDAQ: 인터넷 / 미디어 / 통신 ─────────────────────────────────────
  "spot":       { per: 60,  pbr: 12  }, "rblx":       { per: null,pbr: 15  },
  "roku":       { per: null,pbr: 2   }, "ttwo":       { per: null,pbr: 2.5 },
  "ea":         { per: 22,  pbr: 4   }, "dkng":       { per: null,pbr: 8   },
  "penn":       { per: null,pbr: 0.8 }, "mtch":       { per: 12,  pbr: 3   },
  "iac":        { per: null,pbr: 0.5 }, "tmus":       { per: 24,  pbr: 2.5 },
  "cmcsa":      { per: 11,  pbr: 2   }, "chtr":       { per: 25,  pbr: 2.5 },
  "wbd":        { per: null,pbr: 0.4 }, "para":       { per: 8,   pbr: 0.8 },
  "ntes":       { per: 12,  pbr: 2   }, "lyft":       { per: null,pbr: 4   },
  "ttd":        { per: 80,  pbr: 15  }, "gtlb":       { per: null,pbr: 6   },
  "docu":       { per: 25,  pbr: 4   }, "zm":         { per: 15,  pbr: 2   },
  // ── NASDAQ: 이커머스 / 소비 / 여행 ─────────────────────────────────────
  "shop":       { per: 80,  pbr: 12  }, "abnb":       { per: 35,  pbr: 12  },
  "bkng":       { per: 22,  pbr: 15  }, "expe":       { per: 18,  pbr: 4   },
  "trip":       { per: null,pbr: 1.5 }, "cost":       { per: 50,  pbr: 12  },
  "orly":       { per: 28,  pbr: 15  }, "pcar":       { per: 15,  pbr: 4   },
  "fast":       { per: 32,  pbr: 10  }, "odfl":       { per: 26,  pbr: 6   },
  "wba":        { per: null,pbr: 0.4 }, "khc":        { per: 12,  pbr: 0.8 },
  "mdlz":       { per: 18,  pbr: 3   }, "sbux":       { per: 25,  pbr: 10  },
  "mnst":       { per: 30,  pbr: 6   }, "celh":       { per: 60,  pbr: 4   },
  "lulu":       { per: 20,  pbr: 7   }, "ebay":       { per: 10,  pbr: 5   },
  "pypl":       { per: 16,  pbr: 3.5 }, "uber":       { per: 25,  pbr: 8   },
  "meli":       { per: 45,  pbr: 8   }, "duol":       { per: 120, pbr: 15  },
  "axon":       { per: 100, pbr: 20  }, "deck":       { per: 18,  pbr: 6   },
  "fico":       { per: 50,  pbr: 35  }, "gehc":       { per: 22,  pbr: 2.5 },
  "idxx":       { per: 45,  pbr: 12  }, "podd":       { per: 120, pbr: 8   },
  // ── NASDAQ: 바이오 / 헬스케어 ────────────────────────────────────────────
  "regn":       { per: 14,  pbr: 4   }, "gild":       { per: 13,  pbr: 4.5 },
  "amgn":       { per: 15,  pbr: 25  }, "mrna":       { per: null,pbr: 2   },
  "vrtx":       { per: 30,  pbr: 8   }, "biib":       { per: 14,  pbr: 2   },
  "ilmn":       { per: null,pbr: 2.5 }, "alny":       { per: 70,  pbr: 10  },
  "bmrn":       { per: null,pbr: 2.5 }, "exas":       { per: null,pbr: 3   },
  "crsp":       { per: null,pbr: 3   }, "beam":       { per: null,pbr: 2   },
  "ntla":       { per: null,pbr: 2   }, "srpt":       { per: 20,  pbr: 3   },
  "acad":       { per: null,pbr: 2   }, "arwr":       { per: null,pbr: 3   },
  "rare":       { per: null,pbr: 2.5 }, "rxrx":       { per: null,pbr: 2   },
  "nvax":       { per: null,pbr: 1.5 }, "algn2":      { per: 25,  pbr: 4   },
  "isrg":       { per: 60,  pbr: 10  }, "holx":       { per: 14,  pbr: 2.5 },
  "dxcm":       { per: 55,  pbr: 8   },
  // ── NASDAQ: AI / 양자 / 크립토 ──────────────────────────────────────────
  "app":        { per: 60,  pbr: 20  }, "mstr":       { per: null,pbr: 5   },
  "path":       { per: null,pbr: 4   }, "qubt":       { per: null,pbr: 8   },
  "rgti":       { per: null,pbr: 5   }, "qbts":       { per: null,pbr: 6   },
  "arqq":       { per: null,pbr: 3   }, "soun":       { per: null,pbr: 8   },
  "bbai":       { per: null,pbr: 2   }, "coin":       { per: 20,  pbr: 4   },
  "mara":       { per: null,pbr: 1   }, "riot":       { per: null,pbr: 1   },
  "clsk":       { per: null,pbr: 1   }, "hut":        { per: null,pbr: 0.8 },
  "wulf":       { per: null,pbr: 1   }, "corz":       { per: null,pbr: 2   },
  // ── NASDAQ: 전기차 / 우주 / 에너지 / 핀테크 ─────────────────────────────
  "rivn":       { per: null,pbr: 1.5 }, "lcid":       { per: null,pbr: 1   },
  "nio":        { per: null,pbr: 1.5 }, "li":         { per: 12,  pbr: 2   },
  "achr":       { per: null,pbr: 4   }, "joby":       { per: null,pbr: 3   },
  "rklb":       { per: null,pbr: 8   }, "hood":       { per: 25,  pbr: 3   },
  "sq2":        { per: null,pbr: 2   }, "sofi":       { per: null,pbr: 1.5 },
  "upst":       { per: null,pbr: 3   }, "afrm":       { per: null,pbr: 2.5 },
  "enph":       { per: 20,  pbr: 4   }, "fslr":       { per: 15,  pbr: 2   },
  "plug":       { per: null,pbr: 0.8 }, "fcel":       { per: null,pbr: 0.5 },
  "blnk":       { per: null,pbr: 0.8 }, "nkla":       { per: null,pbr: 0.3 },
  "run2":       { per: null,pbr: 0.8 }, "envx":       { per: null,pbr: 2   },
  // ── NASDAQ: 중국 / 글로벌 ────────────────────────────────────────────────
  "baba":       { per: 14,  pbr: 1.8 }, "pdd":        { per: 12,  pbr: 4   },
  "bidu":       { per: 14,  pbr: 1.2 }, "jd":         { per: 12,  pbr: 1.2 },
  "se":         { per: null,pbr: 3   }, "grab":       { per: null,pbr: 2   },
  // ── KOSPI: 반도체 / IT ───────────────────────────────────────────────────
  "005930_skip":{ per: 13,  pbr: 1.3 }, "000660_skip":{ per: 8,   pbr: 1.6 },
  "012450_skip":{ per: 22,  pbr: 2   }, "005380_skip":{ per: 6,   pbr: 0.5 },
  "034020_skip":{ per: 15,  pbr: 1   }, "009150":     { per: 12,  pbr: 1.2 },
  "011070":     { per: 10,  pbr: 0.9 }, "000990":     { per: 12,  pbr: 1   },
  "035420":     { per: 25,  pbr: 2   }, "035720":     { per: 30,  pbr: 2   },
  "259960":     { per: 18,  pbr: 3   }, "323410":     { per: 20,  pbr: 2   },
  "377300":     { per: null,pbr: 2.5 }, "018260":     { per: 15,  pbr: 1.5 },
  "402340":     { per: 14,  pbr: 0.8 }, "032640":     { per: 10,  pbr: 0.8 },
  "017670":     { per: 10,  pbr: 1.2 }, "030200":     { per: 8,   pbr: 0.6 },
  // ── KOSPI: 자동차 / 부품 ─────────────────────────────────────────────────
  "000270":     { per: 5,   pbr: 0.6 }, "012330":     { per: 7,   pbr: 0.7 },
  "086280":     { per: 10,  pbr: 1.5 }, "204320":     { per: 10,  pbr: 0.6 },
  "011210":     { per: 7,   pbr: 0.5 }, "018880":     { per: 10,  pbr: 0.8 },
  "161390":     { per: 8,   pbr: 0.9 }, "073240":     { per: 10,  pbr: 0.7 },
  "002350":     { per: 10,  pbr: 0.7 }, "241560":     { per: 8,   pbr: 1   },
  "267270":     { per: 8,   pbr: 0.7 },
  // ── KOSPI: 조선 / 기계 / 방산 ───────────────────────────────────────────
  "329180":     { per: 15,  pbr: 2   }, "042660":     { per: null,pbr: 1.5 },
  "009540":     { per: 12,  pbr: 1.5 }, "010140":     { per: null,pbr: 0.7 },
  "272210":     { per: 20,  pbr: 2   }, "047810":     { per: 20,  pbr: 2.5 },
  "454910":     { per: null,pbr: 5   }, "267250_dup": { per: 20,  pbr: 3   },
  "336260":     { per: null,pbr: 2   }, "267270_b":   { per: 18,  pbr: 2   },
  // ── KOSPI: 배터리 / 소재 ─────────────────────────────────────────────────
  "373220":     { per: 40,  pbr: 3   }, "006400":     { per: 18,  pbr: 1.2 },
  "051910":     { per: 20,  pbr: 1   }, "247540":     { per: null,pbr: 3   },
  "086520":     { per: null,pbr: 2   }, "003670":     { per: null,pbr: 2.5 },
  "005490":     { per: 8,   pbr: 0.4 }, "004020":     { per: 7,   pbr: 0.3 },
  "010130":     { per: 10,  pbr: 1.2 }, "011780":     { per: 8,   pbr: 0.9 },
  "285130":     { per: null,pbr: 1.5 }, "004800":     { per: 8,   pbr: 0.6 },
  "120110":     { per: 10,  pbr: 0.5 }, "096770":     { per: null,pbr: 0.8 },
  "010950":     { per: 8,   pbr: 0.7 }, "018670":     { per: 10,  pbr: 1   },
  "011790":     { per: null,pbr: 1.2 }, "001230":     { per: 8,   pbr: 0.4 },
  "001570":     { per: null,pbr: 2   },
  // ── KOSPI: 바이오 / 제약 ─────────────────────────────────────────────────
  "207940":     { per: 45,  pbr: 5   }, "068270":     { per: 35,  pbr: 4   },
  "000100":     { per: 20,  pbr: 3   }, "128940":     { per: 18,  pbr: 3   },
  "006280":     { per: 14,  pbr: 1.5 }, "185750":     { per: 12,  pbr: 1.5 },
  "170900":     { per: 14,  pbr: 1.5 }, "003850":     { per: 12,  pbr: 1   },
  "069620":     { per: 18,  pbr: 3   }, "145020":     { per: 20,  pbr: 4   },
  "302440":     { per: null,pbr: 2   }, "326030":     { per: null,pbr: 3   },
  "002390":     { per: 12,  pbr: 0.8 }, "000230":     { per: null,pbr: 1   },
  "008930":     { per: 15,  pbr: 1   },
  // ── KOSPI: 금융 / 보험 / 증권 ───────────────────────────────────────────
  "105560":     { per: 5,   pbr: 0.45}, "055550":     { per: 6,   pbr: 0.47},
  "086790":     { per: 5,   pbr: 0.42}, "316140":     { per: 4,   pbr: 0.35},
  "138040":     { per: 7,   pbr: 1.2 }, "006800":     { per: 8,   pbr: 0.5 },
  "005940":     { per: 7,   pbr: 0.5 }, "016360":     { per: 8,   pbr: 0.7 },
  "071050":     { per: 6,   pbr: 0.8 }, "039490":     { per: 7,   pbr: 0.8 },
  "032830":     { per: 8,   pbr: 0.5 }, "000810":     { per: 10,  pbr: 0.9 },
  "005830":     { per: 8,   pbr: 0.8 }, "001450":     { per: 8,   pbr: 0.7 },
  "000060":     { per: 7,   pbr: 1   }, "088350":     { per: 8,   pbr: 0.6 },
  // ── KOSPI: 유통 / 소비 / 식품 ───────────────────────────────────────────
  "023530":     { per: 8,   pbr: 0.3 }, "139480":     { per: 10,  pbr: 0.4 },
  "004170":     { per: 9,   pbr: 0.5 }, "007070":     { per: 12,  pbr: 1   },
  "069960":     { per: 10,  pbr: 0.7 }, "282330":     { per: 15,  pbr: 2   },
  "271560":     { per: 12,  pbr: 2   }, "004370":     { per: 12,  pbr: 1.2 },
  "003230":     { per: 20,  pbr: 5   }, "007310":     { per: 14,  pbr: 1.5 },
  "017810":     { per: 15,  pbr: 1   }, "005180":     { per: 12,  pbr: 1   },
  "000080":     { per: 15,  pbr: 2   }, "001040":     { per: 12,  pbr: 0.8 },
  "090430":     { per: 20,  pbr: 1.8 }, "051900":     { per: 15,  pbr: 1.5 },
  "192820":     { per: 18,  pbr: 3   }, "161890":     { per: 15,  pbr: 2   },
  "383220":     { per: 10,  pbr: 1.5 }, "020000":     { per: 10,  pbr: 0.6 },
  "081660":     { per: 12,  pbr: 0.8 },
  // ── KOSPI: 에너지 / 건설 / 물류 ─────────────────────────────────────────
  "015760":     { per: null,pbr: 0.4 }, "036460":     { per: 10,  pbr: 0.8 },
  "009830":     { per: null,pbr: 0.8 }, "011170":     { per: null,pbr: 0.5 },
  "010060":     { per: 10,  pbr: 0.6 }, "028260":     { per: 15,  pbr: 1   },
  "000720":     { per: 8,   pbr: 0.5 }, "006360":     { per: 8,   pbr: 0.4 },
  "047040":     { per: 10,  pbr: 0.5 }, "028050":     { per: 12,  pbr: 2   },
  "078930":     { per: 8,   pbr: 0.6 }, "034730":     { per: 10,  pbr: 0.7 },
  "003550":     { per: 10,  pbr: 0.7 }, "000880":     { per: 10,  pbr: 0.7 },
  "006260":     { per: 10,  pbr: 1   }, "010120":     { per: 15,  pbr: 2   },
  "000150":     { per: 8,   pbr: 0.5 }, "011200":     { per: 8,   pbr: 0.6 },
  "028670":     { per: 8,   pbr: 0.6 }, "003490":     { per: 9,   pbr: 1.2 },
  "180640":     { per: 12,  pbr: 1   }, "272450":     { per: 12,  pbr: 1.5 },
  "091810":     { per: null,pbr: 0.8 }, "000120":     { per: 12,  pbr: 0.8 },
  "002320":     { per: 8,   pbr: 0.5 },
  // ── KOSPI: 호텔 / 엔터 / 기타 ───────────────────────────────────────────
  "008770":     { per: 15,  pbr: 1   }, "035250":     { per: 14,  pbr: 1.8 },
  "034230":     { per: 12,  pbr: 1   }, "114090":     { per: 10,  pbr: 0.8 },
  "030000":     { per: 10,  pbr: 1.5 }, "033780":     { per: 10,  pbr: 1.5 },
  "021240":     { per: 12,  pbr: 3   }, "097950":     { per: 12,  pbr: 0.8 },
  // ── KOSDAQ: 바이오 / 제약 ────────────────────────────────────────────────
  "032820_skip":{ per: null,pbr: 1   }, "196170":     { per: null,pbr: 15  },
  "028300":     { per: null,pbr: 3   }, "068760":     { per: 20,  pbr: 2.5 },
  "091990":     { per: 25,  pbr: 3   }, "237690":     { per: 25,  pbr: 4   },
  "328130":     { per: null,pbr: 5   }, "950160":     { per: null,pbr: 2   },
  "214150":     { per: 20,  pbr: 3   }, "060280":     { per: null,pbr: 2   },
  "048260":     { per: 14,  pbr: 2   }, "145720":     { per: 12,  pbr: 1.5 },
  "096530":     { per: 12,  pbr: 0.8 }, "141080":     { per: null,pbr: 5   },
  "950130":     { per: 15,  pbr: 1.5 }, "307280":     { per: null,pbr: 1   },
  "086900":     { per: 25,  pbr: 4   }, "214610":     { per: 20,  pbr: 3   },
  "078940":     { per: null,pbr: 0.5 }, "206640":     { per: 15,  pbr: 1.5 },
  "044180":     { per: null,pbr: 0.5 }, "014620":     { per: 15,  pbr: 1.5 },
  "101000":     { per: null,pbr: 0.5 },
  // ── KOSDAQ: 반도체 / 소재 / 장비 ────────────────────────────────────────
  "357780":     { per: 14,  pbr: 2   }, "058470":     { per: 15,  pbr: 3   },
  "240810":     { per: 15,  pbr: 1.5 }, "140660":     { per: 35,  pbr: 8   },
  "039030":     { per: 18,  pbr: 2   }, "137310":     { per: 12,  pbr: 0.8 },
  "108670":     { per: 10,  pbr: 0.7 }, "450080":     { per: null,pbr: 5   },
  "121600":     { per: null,pbr: 5   }, "005290":     { per: 12,  pbr: 1   },
  "131970":     { per: 12,  pbr: 1.5 }, "319660":     { per: 12,  pbr: 1.5 },
  "036540":     { per: 10,  pbr: 0.7 }, "039440":     { per: null,pbr: 0.5 },
  "277810":     { per: null,pbr: 8   }, "112610":     { per: 15,  pbr: 2   },
  "022100":     { per: 20,  pbr: 2   }, "012510":     { per: 25,  pbr: 5   },
  "076080":     { per: 12,  pbr: 1   }, "178320":     { per: 12,  pbr: 1   },
  "394280":     { per: null,pbr: 5   }, "085370":     { per: 25,  pbr: 3   },
  // ── KOSDAQ: 게임 / 엔터 ──────────────────────────────────────────────────
  "293490":     { per: null,pbr: 1   }, "112040":     { per: null,pbr: 2   },
  "263750":     { per: null,pbr: 1   }, "036570":     { per: 20,  pbr: 1.5 },
  "251270":     { per: null,pbr: 1.2 }, "041510":     { per: 15,  pbr: 2   },
  "352820":     { per: 30,  pbr: 4   }, "035900":     { per: 20,  pbr: 3   },
  "122870":     { per: 15,  pbr: 2   }, "253450":     { per: 20,  pbr: 2   },
  "041960":     { per: null,pbr: 1   }, "214320":     { per: 10,  pbr: 1   },
  "445680":     { per: null,pbr: 5   },
  // ── KOSDAQ: 기타 ─────────────────────────────────────────────────────────
  "357240":     { per: 15,  pbr: 3   }, "215200":     { per: 12,  pbr: 1.5 },
  "089590":     { per: null,pbr: 1.5 }, "109820":     { per: null,pbr: 2   },
  "336570":     { per: 20,  pbr: 2.5 }, "257720":     { per: 10,  pbr: 1.5 },
  "310210":     { per: null,pbr: 3   }, "196300":     { per: 12,  pbr: 0.8 },
  "298380":     { per: null,pbr: 3   },
};

// 저평가 판정: PER과 PBR 기준을 시장별로 다르게 적용
// NASDAQ: PER < 18 AND PBR < 3 (성장주 디스카운트 반영)
// KOSPI:  PER < 12 AND PBR < 1.2 (가치주 기준)
// KOSDAQ: PER < 15 AND PBR < 2   (중소 성장주 기준)
export function isUndervalued(stock: UniverseStock): boolean {
  const v = VALUATION_MAP[stock.id];
  if (!v || v.per === null) return false;
  if (stock.market === "NASDAQ") return v.per < 18 && v.pbr < 3;
  if (stock.market === "KOSPI")  return v.per < 12 && v.pbr < 1.2;
  return v.per < 15 && v.pbr < 2; // KOSDAQ
}

export function filterUniverse(query: string, market: "ALL" | UniverseMarket): UniverseStock[] {
  const q = query.trim().toLowerCase();
  return UNIVERSE_STOCKS.filter((s) => {
    const marketMatch = market === "ALL" || s.market === market;
    if (!q) return marketMatch;
    return marketMatch && (
      s.name.toLowerCase().includes(q) ||
      s.nameEn.toLowerCase().includes(q) ||
      s.ticker.toLowerCase().includes(q) ||
      s.sector.toLowerCase().includes(q)
    );
  });
}
