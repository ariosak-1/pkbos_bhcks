// Hand-curated Boston Dex. Establishments can also be bulk-imported via `npm run seed:places` (Google Places).
// Events are seasonal: they can only be caught with a photo taken inside their window (MM-DD, wraps the new year).
export type PokeType = "historic" | "restaurant" | "cafe" | "sports" | "career";
export type Rarity = "common" | "uncommon" | "rare" | "legendary";
export const RARITY_POINTS: Record<Rarity, number> = { common: 10, uncommon: 25, rare: 60, legendary: 150 };

type Seed = {
  id: string; name: string; types: PokeType[]; rarity: Rarity; lat: number; lng: number;
  domain?: string; blurb: string; season?: [string, string]; event?: boolean;
  abilities: [name: string, type: string, hint: string][];
};

export const SEED: Seed[] = [
  { id: "harvard-yard", name: "Harvard Yard", types: ["historic"], rarity: "uncommon", lat: 42.3745, lng: -71.1170, domain: "harvard.edu", blurb: "Old brick, older trees, John Harvard's shiny shoe.", abilities: [["Shoe Rub", "historic", "touching the John Harvard statue's foot"], ["Widener Steps", "study", "the steps of Widener Library"]] },
  { id: "mit-dome", name: "MIT Great Dome", types: ["historic", "career"], rarity: "uncommon", lat: 42.3597, lng: -71.0921, domain: "mit.edu", blurb: "Home of hacks. Once held a police car.", abilities: [["Infinite Corridor", "study", "the long Infinite Corridor hallway"], ["Killian Court", "historic", "the lawn of Killian Court in front of the dome"]] },
  { id: "mfa", name: "Museum of Fine Arts", types: ["historic"], rarity: "common", lat: 42.3394, lng: -71.0940, domain: "mfa.org", blurb: "Monet to mummies.", abilities: [["Appeal to the Great Spirit", "art", "the horse-and-rider statue at the entrance"], ["Gallery Gaze", "art", "a painting inside a gallery"]] },
  { id: "gardner", name: "Isabella Stewart Gardner Museum", types: ["historic"], rarity: "uncommon", lat: 42.3382, lng: -71.0991, domain: "gardnermuseum.org", blurb: "A Venetian palace with 13 empty frames.", abilities: [["Courtyard Bloom", "art", "the flowering central courtyard"], ["Empty Frame", "mystery", "an empty picture frame"]] },
  { id: "bpl", name: "Boston Public Library", types: ["historic"], rarity: "common", lat: 42.3493, lng: -71.0781, domain: "bpl.org", blurb: "Free to all. Green lamps forever.", abilities: [["Bates Hall", "study", "green reading lamps in Bates Hall"], ["Courtyard Tea", "cafe", "the library courtyard"]] },
  { id: "state-house", name: "Massachusetts State House", types: ["historic", "career"], rarity: "common", lat: 42.3588, lng: -71.0638, domain: "malegislature.gov", blurb: "Gold dome on Beacon Hill.", abilities: [["Golden Dome", "historic", "the gold dome"], ["Sacred Cod", "historic", "a wooden codfish"]] },
  { id: "old-north", name: "Old North Church", types: ["historic"], rarity: "uncommon", lat: 42.3663, lng: -71.0544, domain: "oldnorth.com", blurb: "One if by land.", abilities: [["Two Lanterns", "historic", "the steeple"], ["Paul Revere Mall", "historic", "the Paul Revere statue"]] },
  { id: "faneuil-hall", name: "Faneuil Hall", types: ["historic", "restaurant"], rarity: "common", lat: 42.3600, lng: -71.0568, domain: "faneuilhallmarketplace.com", blurb: "Cradle of Liberty. Also chowder.", abilities: [["Grasshopper Vane", "historic", "the grasshopper weathervane"], ["Quincy Feast", "restaurant", "food from Quincy Market"]] },
  { id: "boston-common", name: "Boston Common", types: ["historic"], rarity: "common", lat: 42.3551, lng: -71.0656, domain: "boston.gov", blurb: "America's oldest park.", abilities: [["Frog Pond", "sports", "skating or splashing at Frog Pond"], ["Swan Boats", "historic", "the swan boats in the Public Garden"]] },
  { id: "mos", name: "Museum of Science", types: ["historic"], rarity: "common", lat: 42.3677, lng: -71.0709, domain: "mos.org", blurb: "Lightning on demand.", abilities: [["Van de Graaff", "science", "the giant lightning generator"], ["Planetarium", "science", "the planetarium dome"]] },
  { id: "aquarium", name: "New England Aquarium", types: ["historic"], rarity: "common", lat: 42.3591, lng: -71.0498, domain: "neaq.org", blurb: "Myrtle the turtle says hi.", abilities: [["Giant Ocean Tank", "nature", "the giant ocean tank"], ["Penguin Parade", "nature", "penguins"]] },
  { id: "uss-constitution", name: "USS Constitution", types: ["historic"], rarity: "rare", lat: 42.3725, lng: -71.0566, domain: "ussconstitutionmuseum.org", blurb: "Old Ironsides. Still commissioned.", abilities: [["Broadside", "historic", "the ship's cannons"], ["Navy Yard", "historic", "the Charlestown Navy Yard"]] },
  { id: "bu", name: "Boston University", types: ["historic"], rarity: "common", lat: 42.3505, lng: -71.1054, domain: "bu.edu", blurb: "Commonwealth Ave, home of the Terriers.", abilities: [["Marsh Plaza", "historic", "Marsh Chapel plaza"], ["Comm Ave Hustle", "study", "students on Comm Ave"]] },
  { id: "northeastern", name: "Northeastern University", types: ["historic", "career"], rarity: "common", lat: 42.3398, lng: -71.0892, domain: "northeastern.edu", blurb: "Co-op capital of the world.", abilities: [["Centennial Quad", "study", "the quad"], ["Co-op Grind", "career", "someone working at a laptop"]] },
  { id: "bc", name: "Boston College", types: ["historic", "sports"], rarity: "uncommon", lat: 42.3355, lng: -71.1685, domain: "bc.edu", blurb: "Gothic spires up the Heartbreak Hill.", abilities: [["Gasson Tower", "historic", "Gasson Hall tower"], ["Eagle Spirit", "sports", "the BC eagle statue"]] },
  { id: "tufts", name: "Tufts University", types: ["historic"], rarity: "common", lat: 42.4075, lng: -71.1190, domain: "tufts.edu", blurb: "Jumbo lives on the hill.", abilities: [["Jumbo", "historic", "the Jumbo elephant statue"], ["Cannon Paint", "art", "the painted cannon"]] },
  { id: "jfk-library", name: "JFK Presidential Library", types: ["historic"], rarity: "uncommon", lat: 42.3163, lng: -71.0342, domain: "jfklibrary.org", blurb: "I.M. Pei glass on Columbia Point.", abilities: [["Harbor Pavilion", "historic", "the glass pavilion"], ["Victura", "nature", "the sailboat on the lawn"]] },
  { id: "arboretum", name: "Arnold Arboretum", types: ["historic"], rarity: "common", lat: 42.2995, lng: -71.1213, domain: "arboretum.harvard.edu", blurb: "281 acres of trees with name tags.", abilities: [["Lilac Sunday", "nature", "lilac blooms"], ["Peters Hill", "nature", "the skyline view from Peters Hill"]] },
  { id: "neptune-oyster", name: "Neptune Oyster", types: ["restaurant"], rarity: "rare", lat: 42.3633, lng: -71.0557, domain: "neptuneoyster.com", blurb: "The line is the appetizer.", abilities: [["Hot Lobster Roll", "seafood", "a lobster roll"], ["Raw Bar", "seafood", "oysters on ice"]] },
  { id: "regina", name: "Regina Pizzeria", types: ["restaurant"], rarity: "common", lat: 42.3654, lng: -71.0566, domain: "reginapizzeria.com", blurb: "Thatcher Street brick oven since 1926.", abilities: [["Brick Oven", "italian", "a whole pizza"], ["North End Night", "restaurant", "the neon sign"]] },
  { id: "mikes-pastry", name: "Mike's Pastry", types: ["restaurant", "cafe"], rarity: "common", lat: 42.3643, lng: -71.0544, domain: "mikespastry.com", blurb: "The white box with blue string.", abilities: [["Cannoli Clutch", "dessert", "a cannoli"], ["String Box", "dessert", "the white pastry box with string"]] },
  { id: "legal-seafoods", name: "Legal Sea Foods", types: ["restaurant"], rarity: "common", lat: 42.3600, lng: -71.0510, domain: "legalseafoods.com", blurb: "If it isn't fresh, it isn't Legal.", abilities: [["Chowder Power", "seafood", "a bowl of clam chowder"], ["Harbor View", "nature", "the harbor"]] },
  { id: "union-oyster", name: "Union Oyster House", types: ["restaurant", "historic"], rarity: "uncommon", lat: 42.3613, lng: -71.0569, domain: "unionoysterhouse.com", blurb: "Oldest restaurant in America, 1826.", abilities: [["Oyster Bar", "seafood", "the old oyster bar"], ["JFK Booth", "historic", "the JFK booth plaque"]] },
  { id: "santarpios", name: "Santarpio's Pizza", types: ["restaurant"], rarity: "uncommon", lat: 42.3724, lng: -71.0337, domain: "santarpiospizza.com", blurb: "East Boston pizza and lamb skewers.", abilities: [["Lamb Skewer", "grill", "grilled lamb skewers"], ["Plane Spotter", "travel", "a plane landing at Logan"]] },
  { id: "dumpling-house", name: "Gourmet Dumpling House", types: ["restaurant"], rarity: "common", lat: 42.3510, lng: -71.0605, blurb: "Soup dumplings on Beach St.", abilities: [["Xiao Long Bao", "chinese", "soup dumplings"], ["Chinatown Gate", "historic", "the Chinatown paifang gate"]] },
  { id: "mr-bartleys", name: "Mr. Bartley's Burger Cottage", types: ["restaurant"], rarity: "uncommon", lat: 42.3726, lng: -71.1160, domain: "mrbartley.com", blurb: "Burgers named after politicians.", abilities: [["Frappe Fuel", "dessert", "a frappe milkshake"], ["Name Game", "restaurant", "the burger menu board"]] },
  { id: "o-ya", name: "O Ya", types: ["restaurant"], rarity: "rare", lat: 42.3513, lng: -71.0583, domain: "oyarestaurantboston.com", blurb: "Leather District omakase.", abilities: [["Omakase", "japanese", "sushi nigiri"], ["Sake Flight", "japanese", "sake"]] },
  { id: "el-pelon", name: "El Pelón Taqueria", types: ["restaurant"], rarity: "common", lat: 42.3434, lng: -71.1006, domain: "elpelon.com", blurb: "Fish tacos near Fenway.", abilities: [["Fish Taco", "mexican", "a fish taco"], ["Pregame Fuel", "sports", "Red Sox gear at the table"]] },
  { id: "boston-public-market", name: "Boston Public Market", types: ["restaurant"], rarity: "common", lat: 42.3622, lng: -71.0573, domain: "bostonpublicmarket.org", blurb: "All-local food hall.", abilities: [["Cider Donut", "dessert", "a cider donut"], ["Local Haul", "restaurant", "produce stands"]] },
  { id: "tatte", name: "Tatte Bakery", types: ["cafe"], rarity: "common", lat: 42.3590, lng: -71.0703, domain: "tattebakery.com", blurb: "Shakshuka and marble counters.", abilities: [["Shakshuka", "restaurant", "shakshuka in a pan"], ["Latte Art", "cafe", "latte art"]] },
  { id: "diesel-cafe", name: "Diesel Cafe", types: ["cafe"], rarity: "common", lat: 42.3967, lng: -71.1225, domain: "diesel-cafe.com", blurb: "Davis Square pool tables and espresso.", abilities: [["Pool Shark", "sports", "the pool table"], ["Davis Drip", "cafe", "a coffee cup"]] },
  { id: "thinking-cup", name: "Thinking Cup", types: ["cafe"], rarity: "common", lat: 42.3524, lng: -71.0640, domain: "thinkingcup.com", blurb: "Stumptown across from the Common.", abilities: [["Hot Chocolate", "cafe", "a hot chocolate"], ["Theater Row", "historic", "the Paramount marquee"]] },
  { id: "flour", name: "Flour Bakery", types: ["cafe"], rarity: "common", lat: 42.3511, lng: -71.0500, domain: "flourbakery.com", blurb: "Sticky buns in Fort Point.", abilities: [["Sticky Bun", "dessert", "a sticky bun"], ["Fort Point", "career", "the Fort Point channel"]] },
  { id: "caffe-vittoria", name: "Caffe Vittoria", types: ["cafe", "historic"], rarity: "uncommon", lat: 42.3637, lng: -71.0545, domain: "vittoriacaffe.com", blurb: "Boston's first Italian cafe, 1929.", abilities: [["Espresso Shot", "italian", "an espresso"], ["Vintage Machines", "historic", "antique espresso machines"]] },
  { id: "fenway-park", name: "Fenway Park", types: ["sports", "historic"], rarity: "uncommon", lat: 42.3467, lng: -71.0972, domain: "redsox.com", blurb: "The Green Monster since 1912.", abilities: [["Green Monster", "sports", "the Green Monster wall"], ["Fenway Frank", "restaurant", "a hot dog"], ["Sweet Caroline", "music", "a crowd singing"]] },
  { id: "td-garden", name: "TD Garden", types: ["sports"], rarity: "uncommon", lat: 42.3662, lng: -71.0621, domain: "tdgarden.com", blurb: "Banners. So many banners.", abilities: [["Banner Count", "sports", "championship banners in the rafters"], ["Parquet Floor", "sports", "the basketball court"]] },
  { id: "harvard-stadium", name: "Harvard Stadium", types: ["sports", "historic"], rarity: "uncommon", lat: 42.3667, lng: -71.1255, domain: "gocrimson.com", blurb: "The horseshoe of 1903.", abilities: [["Stadium Steps", "sports", "running the concrete stadium steps"], ["Crimson Pride", "sports", "Harvard crimson gear"]] },
  { id: "agganis", name: "Agganis Arena", types: ["sports"], rarity: "common", lat: 42.3524, lng: -71.1180, domain: "goterriers.com", blurb: "Terrier hockey.", abilities: [["Rink Side", "sports", "the hockey rink"], ["Concert Night", "music", "a concert stage"]] },
  { id: "cic", name: "Cambridge Innovation Center", types: ["career"], rarity: "common", lat: 42.3628, lng: -71.0832, domain: "cic.com", blurb: "Most startups per square foot on Earth.", abilities: [["Founder Mode", "career", "a whiteboard full of ideas"], ["Free Snacks", "cafe", "a startup kitchen"]] },
  { id: "boston-fed", name: "Federal Reserve Bank of Boston", types: ["career", "historic"], rarity: "uncommon", lat: 42.3517, lng: -71.0538, domain: "bostonfed.org", blurb: "The washboard tower on Atlantic Ave.", abilities: [["Monetary Policy", "career", "the Fed building facade"], ["Dewey Square", "career", "Dewey Square"]] },
  { id: "state-street", name: "State Street Financial Center", types: ["career"], rarity: "common", lat: 42.3540, lng: -71.0573, domain: "statestreet.com", blurb: "Custodian of trillions.", abilities: [["Suit Up", "career", "business attire"], ["Coffee Meeting", "cafe", "a coffee meeting"]] },
  { id: "fidelity", name: "Fidelity Investments", types: ["career"], rarity: "common", lat: 42.3510, lng: -71.0518, domain: "fidelity.com", blurb: "Summer Street towers.", abilities: [["Index Fund", "career", "the Fidelity logo"], ["Lunch Break", "restaurant", "a working lunch"]] },
  { id: "google-cambridge", name: "Google Cambridge", types: ["career"], rarity: "uncommon", lat: 42.3626, lng: -71.0870, domain: "google.com", blurb: "Kendall Square's colorful campus.", abilities: [["Badge In", "career", "the Google sign"], ["Roof Deck", "career", "a rooftop view of Kendall"]] },
  // ---- Events (seasonal / legendary) ----
  { id: "harvard-yale", name: "Harvard–Yale: The Game", types: ["historic", "sports"], rarity: "legendary", lat: 42.3667, lng: -71.1250, domain: "gocrimson.com", event: true, season: ["11-15", "11-23"], blurb: "Since 1875. Every November.", abilities: [["Tailgate", "restaurant", "a tailgate party"], ["Crimson vs Blue", "sports", "football players on the field"]] },
  { id: "head-of-charles", name: "Head of the Charles Regatta", types: ["sports"], rarity: "rare", lat: 42.3700, lng: -71.1220, domain: "hocr.org", event: true, season: ["10-15", "10-25"], blurb: "Largest two-day regatta on Earth.", abilities: [["Bridge Cheer", "sports", "rowing shells under a bridge"], ["Regatta Snack", "restaurant", "food vendor tents"]] },
  { id: "marathon-finish", name: "Boston Marathon Finish Line", types: ["sports", "historic"], rarity: "legendary", lat: 42.3500, lng: -71.0780, domain: "baa.org", event: true, season: ["04-13", "04-22"], blurb: "Boylston Street, Patriots' Day.", abilities: [["Mile 26.2", "sports", "runners finishing"], ["Unicorn Medal", "sports", "a marathon medal"]] },
  { id: "opening-day", name: "Red Sox Opening Day", types: ["sports"], rarity: "rare", lat: 42.3467, lng: -71.0975, domain: "redsox.com", event: true, season: ["03-26", "04-12"], blurb: "Baseball is back on Lansdowne.", abilities: [["First Pitch", "sports", "the pitcher's mound"], ["Lansdowne Street", "sports", "crowds on Lansdowne St"]] },
  { id: "july-fourth-pops", name: "Boston Pops July 4th", types: ["historic"], rarity: "legendary", lat: 42.3566, lng: -71.0738, domain: "bso.org", event: true, season: ["07-03", "07-04"], blurb: "1812 Overture and fireworks on the Esplanade.", abilities: [["Cannon Fire", "music", "fireworks over the Charles"], ["Hatch Shell", "music", "the Hatch Shell stage"]] },
  { id: "first-night", name: "First Night Boston", types: ["historic"], rarity: "rare", lat: 42.3499, lng: -71.0770, domain: "firstnightboston.org", event: true, season: ["12-31", "01-01"], blurb: "New Year's Eve ice sculptures in Copley.", abilities: [["Ice Sculpture", "art", "an ice sculpture"], ["Midnight Fireworks", "music", "fireworks"]] },
  { id: "beanpot", name: "The Beanpot", types: ["sports"], rarity: "rare", lat: 42.3662, lng: -71.0620, domain: "beanpothockey.com", event: true, season: ["02-01", "02-15"], blurb: "BU, BC, Harvard, Northeastern. One pot.", abilities: [["Pot Hoist", "sports", "the Beanpot trophy"], ["Student Section", "sports", "a cheering student section"]] },
];

export const REWARDS = [
  { id: "tatte-5", name: "Tatte $5", domain: "tattebakery.com", cost: 400 },
  { id: "mikes-10", name: "Mike's Pastry $10", domain: "mikespastry.com", cost: 800 },
  { id: "regina-15", name: "Regina Pizzeria $15", domain: "reginapizzeria.com", cost: 1200 },
  { id: "legal-25", name: "Legal Sea Foods $25", domain: "legalseafoods.com", cost: 2000 },
];

export const HUNTS = [
  { id: "red-line-scholar", name: "Red Line Scholar", line: "Red", bonus: 150, pokebos: ["harvard-yard", "mit-dome", "boston-common", "jfk-library"] },
  { id: "freedom-trail", name: "Freedom Trail Quest", line: "Orange", bonus: 200, pokebos: ["boston-common", "state-house", "faneuil-hall", "old-north", "uss-constitution"] },
  { id: "north-end-feast", name: "North End Feast", line: "Green-E", bonus: 120, pokebos: ["neptune-oyster", "regina", "mikes-pastry", "caffe-vittoria"] },
  { id: "fenway-culture", name: "Fenway Culture Crawl", line: "Green-E", bonus: 150, pokebos: ["fenway-park", "mfa", "gardner", "el-pelon"] },
  { id: "kendall-career", name: "Kendall Career Run", line: "Red", bonus: 100, pokebos: ["cic", "google-cambridge", "mit-dome"] },
];

export const COLLEGES = ["Harvard", "MIT", "BU", "BC", "Northeastern", "Tufts", "Emerson", "Suffolk", "UMass Boston", "Berklee", "Simmons", "Wentworth", "Other"];

export type Badge = { id: string; name: string; color: string; test: (s: BadgeStats) => boolean };
export type BadgeStats = { caught: number; types: Record<string, number>; tMiles: number; legendary: number; hunts: number };
export const BADGES: Badge[] = [
  { id: "boulder", name: "First Catch", color: "#a0a0a0", test: (s) => s.caught >= 1 },
  { id: "scholar", name: "Scholar", color: "#a51c30", test: (s) => (s.types.historic || 0) >= 5 },
  { id: "gourmet", name: "Gourmet", color: "#e07b39", test: (s) => (s.types.restaurant || 0) >= 5 },
  { id: "bean", name: "Bean", color: "#6b4226", test: (s) => (s.types.cafe || 0) >= 3 },
  { id: "fan", name: "Superfan", color: "#0c2340", test: (s) => (s.types.sports || 0) >= 3 },
  { id: "suit", name: "Networker", color: "#2f6f4f", test: (s) => (s.types.career || 0) >= 3 },
  { id: "rider-10", name: "10 T Miles", color: "#ED8B00", test: (s) => s.tMiles >= 10 },
  { id: "rider-100", name: "100 T Miles", color: "#003DA5", test: (s) => s.tMiles >= 100 },
  { id: "hunter", name: "Hunter", color: "#00843D", test: (s) => s.hunts >= 1 },
  { id: "legend", name: "Legend", color: "#d4af37", test: (s) => s.legendary >= 1 },
];
