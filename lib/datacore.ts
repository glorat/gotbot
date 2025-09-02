import CONFIG from "./dcmodel/CONFIG";
import { CrewMember } from "./dcmodel/crew";
import { CrewAvatar } from "./wikiparse";

export const STATIC_URL = `https://datacore.app/structured/`;
export const DATACORE_ASSETS_URL = `https://assets.datacore.app/`;

export async function downloadDataCoreCrew() {
  const crewUrl = `${STATIC_URL}crew.json`;
  let result = await fetch(crewUrl);

  if (result.ok) {
    const crew = (await result.json()) as CrewMember[];
    return crew.map((c) => ({
        ...c,
        portrait: { file: `${DATACORE_ASSETS_URL}${c.imageUrlPortrait}` },
        full_body: { file: `${DATACORE_ASSETS_URL}${c.imageUrlFullBody}` },
        default_avatar: false,
        hide_from_cryo: false,
        skills: c.skill_order,
        icon: { file: `${DATACORE_ASSETS_URL}${c.imageUrlPortrait}` },
        wiki: ''
    } as CrewAvatar))
  }
  return null;
}

export function getShortNameFromTrait(trait: string, crewGroup: CrewMember[] | CrewMember, preferEnglish = true) {
	switch(trait) {
		case "dax":
			let daxname = '';
			if (Array.isArray(crewGroup)) {
				daxname = (preferEnglish ? crewGroup[0].short_name_english : '') || crewGroup[0].short_name;
			}
			else {
				daxname = (preferEnglish ? crewGroup.short_name_english : '') || crewGroup.short_name;
			}
			if (daxname === 'Ezri') return daxname;
			return 'Dax';
		case "tpring":
			return "T'Pring";
		case "mbenga":
			return "M'Benga";
		case "gburnham":
			return "G. Burnham";
		case "burnham":
			return "M. Burnham";
		case "mburnham_sr":
			return "M. Burnham, Sr."

		default:
			if (Array.isArray(crewGroup)) {
				return (preferEnglish ? crewGroup[0].short_name_english : '') || crewGroup[0].short_name;
			}
			else {
				return (preferEnglish ? crewGroup.short_name_english : '') || crewGroup.short_name;
			}
	}
}

export const crewVariantIgnore = ['sam_lavelle_crew', 'jack_crusher_crew'];

export function getVariantTraits(subject: CrewMember | string[]): string[] {
	const ignore = [
		'female', 'male',
		'artificial_life', 'nonhuman', 'organic', 'species_8472',
		'admiral', 'captain', 'commander', 'lieutenant_commander', 'lieutenant', 'ensign', 'general', 'nagus', 'first_officer',
		'ageofsail', 'bridge_crew', 'evsuit', 'gauntlet_jackpot', 'mirror', 'niners', 'crewman',
		'crew_max_rarity_5', 'crew_max_rarity_4', 'crew_max_rarity_3', 'crew_max_rarity_2', 'crew_max_rarity_1'
	];
	const ignoreRe = [
		/^exclusive_/,		/* exclusive_ crew, e.g. bridge, collection, fusion, gauntlet, honorhall, voyage */
		/^[a-z]{3}\d{4}$/,	/* mega crew, e.g. feb2023 and apr2023 */
		/^[a-z]{4}\d{4}$/	/* mega crew, e.g. june2024 and july2024 */
	];
	const variantTraits = [] as string[];

	if ("length" in subject) {
		subject.forEach(trait => {
			if (!CONFIG.SERIES.includes(trait) && !ignore.includes(trait) && !ignoreRe.reduce((prev, curr) => prev || curr.test(trait), false)) {
				variantTraits.push(trait);
			}
		});
	}
	else {
		subject.traits_hidden.forEach(trait => {
			if (!CONFIG.SERIES.includes(trait) && !ignore.includes(trait) && !ignoreRe.reduce((prev, curr) => prev || curr.test(trait), false)) {
				variantTraits.push(trait);
			}
		});
	}

	return variantTraits;
}

(async () => {
  const results = await downloadDataCoreCrew();
  if (results?.length) {
    console.log(`${results.length} converted to GotBot format.`);
  }
})();
