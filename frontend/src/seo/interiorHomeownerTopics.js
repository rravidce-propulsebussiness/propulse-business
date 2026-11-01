// Interior homeowner questions: article briefs, not monthly-volume rankings.
// Cost guides must use dated itemised estimates. Vastu is described as traditional belief,
// never as a replacement for structural design, safety, ventilation or approved plans.
const groups = {};
export const INTERIOR_HOMEOWNER_TOPIC_GROUPS=Object.entries(groups).map(([category,entries])=>({category,topics:entries.map(([title,description],index)=>({id:category.toLowerCase().replace(/[^a-z0-9]+/g,'-')+'-'+index,title,description,intent:'Homeowner question / cost / comparison / planning intent',evidence:'Search-language research; exact monthly volume not available from public results'}))}));
export const INTERIOR_HOMEOWNER_TOPICS=INTERIOR_HOMEOWNER_TOPIC_GROUPS.flatMap(group=>group.topics.map(topic=>({...topic,category:group.category})));