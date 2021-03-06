
import * as API from './Interfaces';
import * as fs from 'async-file';
import * as fssync from 'fs';
import _ = require('underscore');
import {Dictionary} from "underscore";
import {MatchCB} from "./matcher";

const matcher = require('./matcher.js');

const Table = require('cli-table3');
import cfg from '../config';

export const skills:string[] = ['cmd','dip','eng','sec','med','sci'];

export interface Skill {
  base: number
  minroll: number
  maxroll: number
}

export interface Char {
  name:string
  chars: string
  stars: number
  maxstars: number
  level: number
  vaulted: boolean
  // For updating ease... FIXME later
  [index: string]: any;
}

export interface CrewDoc {
  _id: number
  username:string
  crew: Array<Char>
  base: any
  prof: any
}


// From wiki/wikidb
export interface SkillInfo {
  stars: number
  level: number
  skill: string
  base: number
  min: number
  max: number
}

export interface CharInfo {
  name: string,
  wiki: string,
  stars: number
  skill: Array<SkillInfo>
  traits: string // comma separated string
  char: string // character class (e.g Picard)
  moreChar: Array<string>
  image: string
  headImage: string
  traits_hidden: Array<string>
}

export interface WikiDB {
  crewentries: Array<CharInfo>
  charToCrew: Dictionary<Array<CharInfo>>
  traits:Array<string>
  charstars:Dictionary<number> // name->stars:number
}


export interface MyStat{
  skill:string
  base:number
  minroll:number
  maxroll:number
}

export interface StatsOpts {
  textOnly?:boolean
  table?:boolean
}

var wikidb : WikiDB;

let json = fssync.readFileSync(cfg.wikidbpath, 'utf8');
let obj = JSON.parse(json);

wikidb = obj;
// @ts-ignore
wikidb.charstars = _.object(wikidb.crewentries.map(x=>x.name), wikidb.crewentries.map(x=>x.stars));
wikidb.charToCrew = _.groupBy(wikidb.crewentries, x=>x.char);

var traitsSet = new Set<string>();
// Add skills as traits
wikidb.crewentries.forEach(x=>x.traits += ',' + _.uniq(x.skill.map(x=>x.skill)).join(',') );
// Add vanilla traits
wikidb.crewentries.forEach(x=>x.traits.split(',').map(x=>x.trim()).forEach((x:string)=>traitsSet.add(x)));
// Add hidden traits
wikidb.crewentries.forEach(x => x.traits_hidden.forEach(y=>traitsSet.add(y)));
wikidb.traits = Array.from(traitsSet);

export function allCrewEntries() : CharInfo[]{
  return _.clone(wikidb.crewentries);
}

export function allChars() {
  return _.keys(wikidb.charToCrew);
}
export function allTraits() {
  return Array.from(wikidb.traits);
}

export function charStars() {
  return wikidb.charstars;
}

export function matchOne(cb:MatchCB, one:string, two:string, three:string) {
  return matcher.matchOne(cb, _.keys(wikidb.charstars), 'character', one, two, three);
}

export function wikiLookup(name:string, cb:any) {
  const entry = _.find(wikidb.crewentries, x=>x.name === name);

  if (!entry) {return cb(`Unknown crew member ${name}`);}

  cb(null, entry);
}

const rating_cal = [{
  std: 351.8560540211502,
  mode: [321.7227407407407, 143.04018518518512, 324.5433703703704, 51.5879259259259, 140.10237037037032, -483.1422592592593, 154.08937037037035, -393.62137037037036, -179.16062962962965, 254.63337037037036, -340.5742962962963, 437.0993703703703, -435.12707407407413, 497.9768148148148, 242.4758148148148, 416.8823703703703, -421.6253703703704, -48.10625925925929, 28.483370370370345, -240.7141851851852, 25.351814814814787, -787.5508148148147, -3.3061851851852118, -486.77281481481486, -351.35862962962966, -313.0971851851852, 447.31137037037035],
  mean: -36.99469684499316,
  median: 25.351814814814787,
  min: -787.5508148148147,
  max: 497.9768148148148
}, {
  std: 496.6085625910777,
  mode: [-406.77831914893613, -373.21870212765964, -460.2310638297872, -567.3214255319149, 791.4826170212767, -169.98378723404247, 480.1182127659574, -85.73248936170211, -772.3092340425532, -135.74942553191485, 97.22657446808515, 712.5301489361703, -789.5159574468084, -126.65670212765956, -359.4633829787235, 588.432574468085, 993.2915744680852, 668.374574468085, 463.75457446808514, -204.64980851063822, 124.69457446808514, -35.27623404255313, 499.0093191489362, -656.9820638297872, -347.15142553191487, 474.05582978723413, 18.425936170212807, 62.20168085106386, 235.68968085106388, -110.19723404255315, -985.6564468085106, -39.391425531914855, 254.10857446808518, 631.5421914893617, 173.28793617021284, -152.4337659574468, -1140.710489361702, -893.9221276595745, -796.9561276595745, 120.48551063829791, -532.3202340425532, -107.40568085106378, 334.6661276595745, 123.6392127659575, -165.48431914893612, 78.20121276595748, -30.82185106382975],
  mean: -53.640448619284726,
  median: -39.391425531914855,
  min: -1140.710489361702,
  max: 993.2915744680852
}, {
  std: 855.7616850995811,
  mode: [496.5218947368422, 532.5057368421053, -168.9692763157894, -1600.2829605263157, 227.94967105263163, 735.6717368421054, 920.3917894736843, -588.2061710526315, 7.174328947368467, 315.1605789473685, -2025.0602763157895, 496.61473684210534, 303.30688157894747, 1230.8118815789476, -280.50617105263154, 925.2317368421053, -240.93543421052627, 613.0127368421053, -203.26226315789464, -198.6661710526313, -2694.3453421052627, -1037.3212763157894, 541.8127894736843, -44.388276315789405, 1170.1467368421054, 72.85989473684216, -417.0013684210525, -463.1842105263157, -1076.1974342105264, 30.136578947368488, -1494.1274342105264, -186.24326315789466, -260.59201315789494, -66.44932894736839, -198.52321052631575, -991.0651315789473, -240.56226315789468, -20.807263157894663, 602.7825789473685, -158.6854210526315, 13.85544736842116, 66.16773684210533, 699.2867368421055, 351.1968289473685, -1315.1341184210528, -450.4537105263157, 650.7397368421053, 5.468631578947439, -211.96896052631567, 665.7097368421054, 143.19073684210534, 500.6686710526316, 112.36473684210534, -120.44811842105258, 268.3058289473685, 366.43373684210536, 23.35472368421059, -1775.4135657894738, 581.4265789473685, -943.4682763157894, 14.162631578947444, 402.94782894736846, 832.8918289473685, -1737.6852763157897, 582.8706710526317, 1008.1005789473685, 1319.4096315789473, -67.50827631578949, -82.28802631578935, -3161.9071842105263, -1191.0191315789473, 412.75473684210533, -249.54721052631572, 171.33373684210537, 851.4718815789475, 48.983828947368494],
  mean: -87.46097766620491,
  median: 14.009039473684302,
  min: -3161.9071842105263,
  max: 1319.4096315789473
}, {
  std: 1347.4179799212518,
  mode: [-422.63156485355626, -1266.3285648535564, 713.3603556485358, -458.9669163179915, -1030.0420292887027, -1264.1695941422593, -1112.0576443514642, 407.7607656903768, -1207.5725230125522, 1262.0331213389122, -1987.5177573221756, -1598.952523012552, -3930.4636778242684, -2504.5238284518828, 2002.437355648536, 1574.124355648536, -196.4451757322174, -401.9117656903764, -1947.060673640167, 209.65920502092067, -1098.070410041841, 197.7743556485358, -840.7725230125521, 293.7183556485358, 649.9153556485358, 580.4274351464437, -353.9387949790794, 500.8173891213391, 100.17923430962375, -2166.0917154811714, 205.80746861924712, -153.94741004184073, 1052.8871213389123, -1829.1027154811713, -460.3966527196651, -276.6436443514642, 131.513267782427, 1219.953267782427, 493.7494351464437, 310.9082426778243, 2459.2305899581593, -3892.418907949791, 1140.958267782427, 2089.666355648536, -798.2007322175731, -602.8246778242676, 114.86020502092072, -724.8147991631797, 10.553355648535794, 2193.7511213389125, -12.072564853556255, -1756.9069958158996, 136.33324267782444, -637.0824435146441, 1164.5654351464436, 1178.0801548117156, -1900.29580334728, -138.83256485355628, 504.94612133891235, -232.5756778242675, 475.33211715481184, 1348.878355648536, 1867.8474351464438, 2399.299476987448, 2066.531242677825, -836.728732217573, 305.72619665271986, 2703.819242677824, 37.32143514644374, -376.6976443514642, -2364.3366736401676, 630.9022426778243, 242.58682426778267, -700.9209665271965, -1075.0508451882845, 369.0752008368203, -195.38544351464415, -589.8540962343094, 485.41343514644365, -4464.425916317992, 1358.1531213389126, 761.6234351464436, -494.56073221757305, -191.58873221757298, -2040.8697615062756, -591.7988870292885, -149.50273221757297, 1126.2034351464436, -1035.3017949790792, -1931.0195230125523, 245.32635564853584, 1416.1763556485357, -518.8717154811715, -1520.115882845188, 2864.662355648536, 540.6903556485357, 923.7334351464436, 46.942920502092285, 779.128347280335, -416.9231757322174, -523.2307322175731, -1989.4678451882842, -1408.0668284518827, -1524.408443514644, 370.1617531380755, -632.2438451882848, 554.4389205020922, -723.6008828451882, 422.49235564853575, -10.431878661087653, 170.69520502092072, 1262.8992677824272, 2289.813435146444, -366.5187322175731, -3430.157882845188, 1640.1472008368205, -706.4836108786608, 1213.7792677824268, -3074.697845188285, 384.4734769874478, -526.2615313807531, 328.66820083682023, 1706.1501213389126, -48.95790794979072, -1420.2898870292881, -3344.8889163179915, -292.7787656903763, 150.33382426778266, 339.6214351464437, -1639.3187991631796, -2198.2958786610875, 739.2552677824269, 619.3464769874478, 119.66834728033497, 56.2852050209207, -460.0095648535563, -2888.654230125523, -2466.674682008368, -584.0467949790793, 661.7942050209207, -1520.1871757322172, -779.2547154811713, -2768.736828451883, 992.5933221757325, 1772.3861213389123, -490.1157573221754, 944.3663556485358, -626.9132301255229, -2158.8708284518825, 390.0943556485358, -751.8860962343095, 554.3802426778242, 713.9315899581592, 2022.925476987448, -156.04967782426763, 2590.502686192469, -219.48471548117132, -224.7097573221755, -234.80407949790774, 419.0414351464437, 1327.4561548117158, -1946.2508451882843, 1876.9353556485357, 1148.1053556485358, -4349.980765690376, 2556.498686192469, 1543.929476987448, 529.6045564853558, 15.72847698744788, 760.7603556485358, -1593.3429999999996, -300.74971548117134, -864.0030292887028, -623.6040292887028, -919.1865941422593, 233.72638912133917, 777.259476987448, 1434.0881213389125, -1863.0058451882837, 52.4032008368203, -1650.7367949790794, 1563.6123556485359, 1087.9572008368202, 414.73035564853575, -1347.008794979079, -712.8045230125521, -619.1276778242674, -2247.1754435146436, 1593.6383472803352, 2134.408154811716, -438.2935648535563, -729.4388033472802, -834.7205230125521, 1005.0993556485357, -2528.98680334728, 628.1723221757327, -499.93765271966504, 613.0134769874479, -1344.0258451882844, -587.736732217573, -1713.0879163179914, -361.1687656903764, 1719.376556485356, 992.7342426778247, -904.6785313807528, -2538.2169958158993, 728.4334351464437, -926.3887949790794, -826.7916527196652, -1089.8958828451882, 55.97743514644374, 1681.3834351464438, -95.51084518828418, 534.9355564853557, -1391.708443514644, 1429.2403556485358, -166.04371548117135, -1599.3368451882845, 973.7795899581592, 906.8163556485358, 1450.8954351464438, 1492.4194351464437, 1326.249355648536, -2127.6437949790793, -582.6376443514642, -1674.073594142259, -178.44984518828426, -1217.0296736401674, -1260.003150627615, 561.3910334728035, -629.9194435146442, -353.03575732217547, 170.89943514644372, 302.02043514644373, 968.1332343096236, 1153.9460334728035, 249.2218242677827, -859.4607991631797, 560.8801213389123],
  mean: -148.54323705817447,
  median: -95.51084518828418,
  min: -4464.425916317992,
  max: 2864.662355648536
}, {
  std: 1456.1592011506746,
  mode: [-1825.376779816513, -890.647733944954, 1837.2816880733947, -3107.7857798165137, 1472.0812660550464, -1134.7447339449539, 1580.4462660550462, -1981.021963302752, -250.78973394495398, 700.965266055046, 1235.4522201834864, -652.8153761467888, -2617.4807798165134, 15.61565137614687, -3495.209596330275, -815.1535137614678, 2084.670302752294, -115.35680733944946, 767.085266055046, -227.7126972477063, -1189.692128440367, -349.8227798165137, -3874.1697798165137, 475.3042201834864, 1386.2790825688076, -806.8153119266053, -2080.520917431192, -1281.5835596330273, -1944.964963302752, -3987.679779816513, -1546.0437798165128, 376.80622018348646, -393.6345321100916, 764.1684678899084, 501.57722018348636, -234.70691743119255, -17.37328440366955, -893.5035963302751, 1859.8914036697252, -2807.3185963302753, 1065.1750825688075, -208.88591743119258, 857.452266055046, 742.3158348623854, -769.9910550458715, -1974.6732385321097, -511.96091743119257, -727.0893486238532, -720.6357798165137, -1132.7001009174312, -1907.160311926606, -1230.5431651376146, 2700.614467889908, -529.9583486238531, -3752.9565963302753, 1670.8504678899087, -3230.6193119266045, 562.3906880733942, -767.636733944954, -164.84691743119257, 722.6731192660554, 1993.3550825688078, 411.25857798165157, -4410.895394495413, 1298.9981926605506, 1964.7336513761472, 699.0705779816516, 64.82508256880745, 1650.684302752294, 1030.4330825688075, 897.6880825688074, -808.7799633027521, 597.3020825688075, 68.29630275229373, 2680.9292201834864, -1342.4917798165136, 88.83708256880762, -565.0573486238532, 349.64465137614695, -2038.1915321100914, -665.0239174311926, -1724.9874220183483, 894.5824862385322, -46.96869724770632, -462.45991743119254, 1201.5648990825691, -1445.4899633027526, -2656.481100917432, -1032.3159174311927, -1405.545559633027, 1741.0044678899085, -15.264348623853017, -281.9717798165135, 10.56983486238545, 776.0928348623855, 569.0584678899082, 1343.6884678899085, -2116.5267798165137, 687.4964862385323, -1592.922559633027, 2371.1694862385325, -619.523990825688, 1190.4492201834864, -849.3525321100917, 957.5076880733947, -2288.2881284403666, 765.5496880733947, 2114.9568715596333, 181.46708256880746, -1543.7122110091743, -1010.2813119266054, -558.2103119266056, 263.77646788990825, -1122.0193119266055, -94.21873394495402, -2249.161211009174, -487.6526972477063, 530.973623853211, -2597.778596330275, 725.7263027522937, -1309.851596330275, -1630.946596330275, 590.4510825688075, -470.8695321100916, 833.658899082569, -1858.6097798165135, -1199.1133486238532, 1030.7820825688075, 1662.2170825688074, 1798.1324862385322, -267.7809174311925, 201.90308256880743, -231.65710091743102, 1292.547266055046, 3053.0790825688073, -2262.963348623853, 476.7286513761469, -630.0739174311925, 567.2574678899084, 2456.9670825688077, 1379.2984678899086, 1778.8440825688076, -79.79853211009139, -1796.9983119266049, -168.23955963302745, -3003.6269908256877, 112.97508256880748, 1435.7881926605507, -106.35210091743107, 780.2477889908258, -93.47896330275218, 888.957266055046, 694.840651376147, 871.2362201834865, -104.94951376146781, 89.43883486238543, 681.6875779816515, -390.71742201834843, -2171.355596330275, 1532.1092660550462, 2413.4040825688076, -789.8987798165135, -674.2296972477062, 895.3764678899083, -1927.1946697247704, 1305.5421192660551, -2766.6493944954127, 2331.764302752294, 272.42503669724783, 2124.6690825688074, 306.67765137614697, -1809.3775321100914, 1160.4340550458717, -399.75505504587125, 2155.844651376147, -243.2449174311925, 1599.498266055046, -1138.9441651376146, -313.8943486238529, -1538.2466972477062, 259.3348990825689, -1285.9035321100914, 1148.3490825688075, 363.10708256880747, 550.339266055046, -988.7161284403668, 502.3540825688074, -1272.8043486238532, 737.4680825688074, 956.656266055046, -1197.8555137614678, -617.026733944954, -3059.3077798165136, 526.2436513761469, -3990.127311926605, 34.97922018348638, -3576.4439908256877, 512.5186238532111, -253.51977981651362, -866.9874220183484, 534.7350825688075, 2162.1190825688077, 1134.8500825688075, 397.27146788990837, 146.2756513761469, 470.38446788990825, -352.3359174311925, -1065.7654220183485, -1318.380100917431, -664.7239174311927, 645.4812201834865, 347.90708256880754, 962.5525779816516, 1014.2559266055048, -363.60931192660536, -95.78212844036682, -2064.4001284403666, -601.2273944954126],
  mean: -181.25751515023956,
  median: -93.8488486238531,
  min: -4410.895394495413,
  max: 3053.0790825688073
}];

// @ts-ignore
Number.prototype.between = function(a, i, r) {
  var e = Math.min(a, i)
    , o = Math.max(a, i);
  return r ? this >= e && this <= o : this > e && this < o;
};

export function generateDifficulty(a:any, i?:any, r?:any) {
  var e = a.difficulty
    , o = ""
    , n = "";
  if (isNaN(a.difficulty) || null === a.difficulty)
    return 'Incomplete';
  var s = rating_cal[a.stars - 1].median
    , t = rating_cal[a.stars - 1].std / 1.5;
  return e.between(s - t, s + t, !0) ? (o = "Average",
    n = "#f7e92c") : e.between(s - 2 * t, s - t, !0) ? (o = "Above Average",
    n = "#f4b411") : e.between(s - 3 * t, s - 2 * t, !0) ? (o = "Difficult",
    n = "#f47f11") : e.between(s - 4 * t, s - 3 * t, !0) ? (o = "Hard",
    n = "#d60853") : e < s - 4 * t ? (o = "Insane",
    n = "#ef1f6b") : e.between(s + 2 * t, s + t, !0) ? (o = "Below Average",
    n = "#aee26a") : e.between(s + 3 * t, s + 2 * t, !0) ? (o = "Easy",
    n = "#aee26a") : e.between(s + 4 * t, s + 3 * t, !0) ? (o = "Very Easy",
    n = "#62e05e") : e > s + 4 * t && (o = "Super Easy",
    n = "#30e829"),
    r ? n : i ? o : o;
}

export async function ssrLookup(name:string, cb:any) {
  var wname=name.replace(/"/gi,"!Q!");
  wname=wname.replace(/,/gi,"!C!");
  try {
    let data = await fs.readFile(`${cfg.dataPath}/ssr.izausomecreations.com/crew/${wname}.json`, 'utf8');
    const obj = JSON.parse(data);
    cb (obj.info ? obj.info : {});
  }
  catch {
    cb({});
  }

}

function shortName(name:string) {
  const re = /(\S+)/g;
  let match = re.exec(name);
  let parts = [];
  while (match) {
    parts.push(match[0]);
    match = re.exec(name);
  }

  const shorter = _.first(parts, parts.length-1).map(x => x.substring(0,1)).join('');
  return [shorter, _.last(parts)];
}

export function statsFor(char:Char, emojify:API.EmojiFn, boldify:API.BoldifyFn, opts:StatsOpts) {
  if (!opts) opts = {};

  let mystats:Array<MyStat> = [];
  // Get skills into an array
  let sksrc = char.adj ? char.adj : char; // Use adjusted if available!
  skills.forEach(sk => {
    if (char[sk]) {
      mystats.push({skill:sk, base:sksrc[sk].base, minroll: sksrc[sk].minroll, maxroll:sksrc[sk].maxroll});
    }
  });
  // Sort by base
  mystats = _.sortBy(mystats, x=>-x.base);
  if (opts.textOnly) {
    const starStr = char.stars ? `${char.stars}/${char.maxstars}` : '';
    const levelStr = char.level ? `Lvl ${char.level}` : '';
    const skStr = _.map(mystats, sk => `${sk.skill} ${sk.base}`).join(' ');
    return `${starStr} ${char.name} ${levelStr} ${skStr}`;
  }
  else if(opts.table) {
    const shorts = shortName(char.name);
    const nm = char.vaulted ? `(${shorts[1]})` : shorts[1];
    return [shorts[0], nm, char.stars, char.maxstars, char.level].concat(skills.map(sk=>sksrc[sk] ? sksrc[sk].base : ''));
  }
  else {
    const skStr = _.map(mystats, sk => `${emojify(sk.skill)} ${sk.base} (${sk.minroll}-${sk.maxroll})`).join(' ');
    const starStr = _.range(char.stars).map(x => emojify('1star')).join('');
    const darkStr = _.range(char.maxstars - char.stars).map(x => emojify('1darkstar')).join('');
    const levelStr = (char.level !== 100) ? `(Level ${char.level})` : '';
    return `${boldify(char.name)} ${levelStr}\n   ${starStr}${darkStr} - ${skStr}`;
  }


}

/** Mutate char to be fully equipped given info and stars
 * */
export function fullyEquip(char:Char, info:CharInfo|undefined, stars:number=0, level:number=0) {
  if (!(info!==undefined && info.skill)) {
    console.log (`fullyEquip is lacking info for ${char.name}`);
    return char;
  }
  const skill = info.skill;
  level = level ? level : 100;
  stars = stars ? stars : info.stars;
  const starSk = _.filter(skill, sk => sk.stars === stars && sk.level === level);
  // const skStr = _.map(starSk, sk => `${emojify(sk.skill)} ${sk.base} (${sk.min}-${sk.max})`).join(' ');

  starSk.forEach(sk => {
    const s = sk.skill.toLowerCase();
    char[s] = {};
    char[s].base = sk.base;
    char[s].minroll = sk.min;
    char[s].maxroll = sk.max;
  });
  char.level = level;
  char.stars = stars;
  char.maxstars = info.stars;
  return char;
}



export function bestChars(entrys:Array<any>, stars:number, fuse:number, category:string, level:number, skill1:string, skill2:string){
  if (stars) {
    entrys = entrys.filter(x=>x.stars <= stars);
  }
  entrys = entrys.map(_.clone); // Shallow clone as we will add a result

  interface Entry {
    map : (sk:any) => number,
    reduce : (x:_.List<number>) => number,
    default: number
  }
  interface EntryFn extends Dictionary<any> {
    base: Entry
    gauntlet: Entry
    minroll: Entry
    avg:Entry
  }

  const entryFn : EntryFn  = {
    base: {
      map: sk => sk ? sk.base : 0,
      reduce: x => _.reduce(x,function (memo, num) {return num > memo ? num : memo;},0),
      default: 0
    },
    gauntlet: {
      map: sk => sk ? (sk.min + sk.max) / 2 : 0,
      reduce: x => _.reduce(x,function (memo, num) {return memo+num;},0),
      default: 0
    },
    minroll: {
      map: sk => sk ? (sk.min) : 0,
      reduce: x => _.reduce(x,function (memo, num) {return memo+num;},0),
      default: 0
    },
    avg: {
      map: sk => sk ? (sk.base + (sk.min + sk.max) / 2) : 0,
      reduce: x => _.reduce(x,function (memo, num) {return memo+num;},0),
      default: 0
    }
  };

  const catFn = entryFn[category];
  entrys.forEach(e => {
    e.result = 0;
    const skillMatch = (skill1 === '' && skill2 === '') ? skills : [skill1, skill2];

    const fnVals = skillMatch.map(skill => {
      if (skill) {
        const sk = e.skill.find( (s:SkillInfo) => s.level===level && (fuse ? fuse : e.stars) === s.stars && s.skill === skill);
        return catFn.map(sk);
      }
      else {
        return catFn.default;
      }
    });

    e.result = catFn.reduce(fnVals);
  });
  entrys = _.sortBy(entrys, x=>-x.result);
  return entrys;
}


export function createCrewTable(entries: Array<any>, searchParams:Array<string>, charsToSearch:Array<any>, emojify: API.EmojiFn, boldify: API.BoldifyFn) {
  const matchingNames = entries.map(x => x.name);
  const matchingRoster = charsToSearch.filter(x => _.contains(matchingNames, x.name));
  //const sortFn = x => -(x.maxstars * 10000 + x.stars * 1000 + _.max(skills.map(sk => x[sk] ? x[sk].base : 0)));
  const sortFn = (x:any) => -(_.max(skills.map(sk => x[sk] ? x[sk].base : 0)));
  const sortedRoster = _.first(_.sortBy(matchingRoster, sortFn), 20); // 20 seems a safe arbitrary number
  const totalMatches = matchingRoster.length;

  let table = new Table({
    chars: {
      'top': '', 'top-mid': '', 'top-left': '', 'top-right': '', 'bottom': '',
      'bottom-mid': '', 'bottom-left': '', 'bottom-right': '', 'left': '',
      'left-mid': '', 'mid': '', 'mid-mid': '', 'right': '', 'right-mid': '',
      'middle': ''
    },
    style: {'padding-left': 0, 'padding-right': 1},
    wordWrap: true
  });
  table.push(['', 'Name', '*', '*', 'Lvl'].concat(skills));

  const lines = sortedRoster.map(char => {
    const tabOpts = {table: true};
    let ret = statsFor(char, emojify, boldify, tabOpts);
    table.push(ret);
  });
  const ret = `${lines.length}/${totalMatches} matches for ${searchParams.join(', ')}\n` + '```' + table.toString() + '```';
  return ret;
}

export function searchCrewByCharTrait (criteria: Array<string>, entries: Array<CharInfo>) {
  let charsAndTraits = allTraits();
  // Only include chars if we don't already have hidden traits from stt
  cfg.useSttCrewEntries || (charsAndTraits=charsAndTraits.concat(allChars()));
  let searchParams: Array<string> = [];
  criteria.filter(x => x !== '').forEach(name => {
    matcher.matchOne(function (err:any, res:string) {
      if (err) {
        throw err;
      }
      searchParams.push(res);
      entries = entries.filter(
        entry => {
          const matchTraits = entry.traits.split(',').map((x:string) => x.trim())
              .concat(entry.traits_hidden);

          return _.contains(matchTraits, res)
          || (entry.char === res)
          || _.contains(entry.moreChar, res);
        });

    }, charsAndTraits, 'char or trait', name);
  });
  return {searchParams: searchParams, entries: entries};
}
