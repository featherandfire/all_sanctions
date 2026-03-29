const US_STATE_NAMES = {
  ak:'Alaska', al:'Alabama', ar:'Arkansas', az:'Arizona', ca:'California',
  co:'Colorado', ct:'Connecticut', dc:'DC', de:'Delaware', fl:'Florida',
  ga:'Georgia', hi:'Hawaii', ia:'Iowa', id:'Idaho', il:'Illinois',
  in:'Indiana', ks:'Kansas', ky:'Kentucky', la:'Louisiana', ma:'Massachusetts',
  md:'Maryland', me:'Maine', mi:'Michigan', mn:'Minnesota', mo:'Missouri',
  ms:'Mississippi', mt:'Montana', nc:'North Carolina', nd:'North Dakota',
  ne:'Nebraska', nh:'New Hampshire', nj:'New Jersey', nm:'New Mexico',
  nv:'Nevada', ny:'New York', oh:'Ohio', ok:'Oklahoma', or:'Oregon',
  pa:'Pennsylvania', ri:'Rhode Island', sc:'South Carolina', sd:'South Dakota',
  tn:'Tennessee', tx:'Texas', ut:'Utah', va:'Virginia', vt:'Vermont',
  wa:'Washington', wi:'Wisconsin', wv:'West Virginia', wy:'Wyoming',
};

// Deterministic HSL color per state — same state = same color across every chart
const STATE_COLOR_MAP = (() => {
  const names = Object.values(US_STATE_NAMES).sort();
  const map = { Federal: '#94a3b8' };
  names.forEach((s, i) => {
    const h = Math.round((i / names.length) * 360);
    map[s] = `hsl(${h},62%,54%)`;
  });
  return map;
})();

// Deterministic color from any string (used for country names in cyber chart)
function _hashColor(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return `hsl(${Math.abs(h) % 360},62%,54%)`;
}

const CATEGORY_META = {
  'crypto':         { label: 'Cryptocurrency',    color: '#f6c90e', icon: '₿' },
  'ransomware':     { label: 'Ransomware',         color: '#f56565', icon: '🔒' },
  'state-sponsored':{ label: 'State-Sponsored',   color: '#a78bfa', icon: '🎯' },
  'cyber':          { label: 'Cyber Actors',       color: '#4f8ef7', icon: '💻' },
  'darknet':        { label: 'Darknet',            color: '#fb923c', icon: '🕸' },
  'other':          { label: 'Other',              color: '#64748b', icon: '⚠' },
};

const SCHEMA_COLORS = {
  CryptoWallet: '#f6c90e', Person: '#4f8ef7', Organization: '#3ecf8e',
  Company: '#3ecf8e', LegalEntity: '#3ecf8e', Vessel: '#fb923c',
  Vehicle: '#fb923c', Sanction: '#f56565', Position: '#a78bfa',
  Address: '#64748b',
};

// Priority column order — any keys found in results but not listed here appear after
const ES_COL_PRIORITY = [
  'schema','name','aliases','identifiers','birth_date','countries',
  'addresses','sanctions','phones','emails','program_ids','_dataset',
  'dataset','first_seen','last_seen','last_change','id',
];

// Human-readable labels for known keys
const ES_COL_LABELS = {
  schema:'Type', name:'Name', aliases:'Aliases', identifiers:'Identifiers',
  birth_date:'Birth Date', countries:'Countries', addresses:'Addresses',
  sanctions:'Sanctions', phones:'Phones', emails:'Emails',
  program_ids:'Program IDs', _dataset:'Dataset', dataset:'Dataset (full)',
  first_seen:'First Seen', last_seen:'Last Seen', last_change:'Last Changed', id:'ID',
};

// Min-widths for specific columns (px). Default is 120px.
const COL_WIDTHS = {
  name: 200, caption: 200, aliases: 160, alias: 160,
  address: 200, address_full: 200, addresses: 200,
  sanctions: 200, sanction_summary: 300, sanction_reason: 480,
  sanction_sourceUrl: 260, sourceUrl: 260,
  id: 260, _dataset: 160,
};

const COUNTRY_NAMES = {
  us:'United States',eu:'European Union',gb:'United Kingdom',ru:'Russia',
  ca:'Canada',au:'Australia',de:'Germany',fr:'France',jp:'Japan',ch:'Switzerland',
  nl:'Netherlands',zz:'International',ua:'Ukraine',cn:'China',il:'Israel',
  br:'Brazil',pl:'Poland',lt:'Lithuania',tr:'Turkey',
  in:'India',kr:'South Korea',sg:'Singapore',no:'Norway',se:'Sweden',
  dk:'Denmark',fi:'Finland',be:'Belgium',at:'Austria',es:'Spain',
  it:'Italy',pt:'Portugal',ie:'Ireland',nz:'New Zealand',za:'South Africa',
  ng:'Nigeria',ke:'Kenya',gh:'Ghana',mx:'Mexico',ar:'Argentina',
  cl:'Chile',co:'Colombia',pe:'Peru',my:'Malaysia',id:'Indonesia',
  th:'Thailand',ph:'Philippines',vn:'Vietnam',pk:'Pakistan',bd:'Bangladesh',
  eg:'Egypt',ma:'Morocco',tn:'Tunisia',ge:'Georgia',am:'Armenia',
  az:'Azerbaijan',kz:'Kazakhstan',uz:'Uzbekistan',rs:'Serbia',
  ba:'Bosnia',hr:'Croatia',si:'Slovenia',sk:'Slovakia',cz:'Czechia',
  hu:'Hungary',ro:'Romania',bg:'Bulgaria',gr:'Greece',cy:'Cyprus',
  lu:'Luxembourg',mt:'Malta',ee:'Estonia',lv:'Latvia',jo:'Jordan',
  lb:'Lebanon',kw:'Kuwait',ae:'UAE',sa:'Saudi Arabia',qa:'Qatar',
  iq:'Iraq',ir:'Iran',sy:'Syria',kp:'North Korea',mm:'Myanmar',
  by:'Belarus',md:'Moldova',np:'Nepal',
};

const COUNTRY_FLAGS = {
  us:'🇺🇸',eu:'🇪🇺',gb:'🇬🇧',ru:'🇷🇺',ca:'🇨🇦',au:'🇦🇺',de:'🇩🇪',
  fr:'🇫🇷',jp:'🇯🇵',ch:'🇨🇭',nl:'🇳🇱',zz:'🌐',ua:'🇺🇦',cn:'🇨🇳',
  il:'🇮🇱',br:'🇧🇷',pl:'🇵🇱',lt:'🇱🇹',tr:'🇹🇷',in:'🇮🇳',kr:'🇰🇷',
  sg:'🇸🇬',no:'🇳🇴',se:'🇸🇪',dk:'🇩🇰',fi:'🇫🇮',be:'🇧🇪',at:'🇦🇹',
  es:'🇪🇸',it:'🇮🇹',pt:'🇵🇹',ie:'🇮🇪',nz:'🇳🇿',za:'🇿🇦',ng:'🇳🇬',
  ke:'🇰🇪',gh:'🇬🇭',mx:'🇲🇽',ar:'🇦🇷',cl:'🇨🇱',co:'🇨🇴',pe:'🇵🇪',
  my:'🇲🇾',id:'🇮🇩',th:'🇹🇭',ph:'🇵🇭',vn:'🇻🇳',pk:'🇵🇰',bd:'🇧🇩',
  eg:'🇪🇬',ma:'🇲🇦',tn:'🇹🇳',ge:'🇬🇪',am:'🇦🇲',az:'🇦🇿',kz:'🇰🇿',
  uz:'🇺🇿',rs:'🇷🇸',ba:'🇧🇦',hr:'🇭🇷',si:'🇸🇮',sk:'🇸🇰',cz:'🇨🇿',
  hu:'🇭🇺',ro:'🇷🇴',bg:'🇧🇬',gr:'🇬🇷',cy:'🇨🇾',lu:'🇱🇺',mt:'🇲🇹',
  ee:'🇪🇪',lv:'🇱🇻',jo:'🇯🇴',lb:'🇱🇧',kw:'🇰🇼',ae:'🇦🇪',sa:'🇸🇦',
  qa:'🇶🇦',iq:'🇮🇶',ir:'🇮🇷',sy:'🇸🇾',kp:'🇰🇵',mm:'🇲🇲',by:'🇧🇾',
  md:'🇲🇩',np:'🇳🇵',
};

const COL_LABELS = {
  caption: 'Address / Name', schema: 'Schema', publicKey: 'Public Key',
  currency: 'Currency', managingExchange: 'Exchange', accountId: 'Account ID',
  holder: 'Holder', holder_alias: 'Holder Alias', topics: 'Topics',
  sanction_authority: 'Authority', sanction_id: 'Order ID',
  sanction_country: 'Country', sanction_start: 'Start Date',
  sanction_end: 'End Date', first_seen: 'First Seen',
  last_seen: 'Last Seen', last_change: 'Last Change', id: 'Record ID',
  name: 'Name', alias: 'Alias', nationality: 'Nationality',
  address: 'Address', birthDate: 'Birth Date', country: 'Country',
};
