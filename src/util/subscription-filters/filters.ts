import teams from "./teams";
import prefixes from "./prefix";

import terms from "./terms";
import regex from "./regex";
import excludeTerms from "./excludeTerms";
import communitySubdomains from "./community-subdomains";

const allTerms = terms.concat(teams);

export {
    regex,
    excludeTerms,
    allTerms,
    prefixes,
    communitySubdomains
}
