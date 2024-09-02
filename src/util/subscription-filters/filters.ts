import teams from "./teams";
import prefix from "./prefix";

import terms from "./terms";
import regex from "./regex";
import excludeTerms from "./excludeTerms";

const allTerms = terms.concat(teams, prefix);

export {
    regex,
    excludeTerms,
    allTerms
}