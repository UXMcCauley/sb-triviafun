import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function topUp(filename, questions) {
  const filePath = path.join(__dirname, '..', 'data', 'packs', filename);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const before = data.questions.length;
  data.questions.push(...questions);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  console.log(`${data.name}: ${before} → ${data.questions.length}`);
}

// === FAMILY SHOWS (+2) ===
topUp('the-family-shows.json', [
  {
    questionText: "What is the name of the Winslow family matriarch played by Jo Marie Payton in Family Matters?",
    options: ["Harriette Winslow", "Estelle Winslow", "Rachel Crawford", "Laura Winslow"],
    correctAnswerIndex: 0, category: "Characters", difficulty: "medium",
    source: { url: "https://en.wikipedia.org/wiki/Family_Matters", description: "Wikipedia - Family Matters" },
    funFact: "Jo Marie Payton left the show during the final season. Judyann Elder replaced her for the last 6 episodes — a change many fans didn't even notice."
  },
  {
    questionText: "What is the name of Carol Foster-Lambert's business in Step by Step?",
    options: ["A hair salon", "A bakery", "A florist shop", "A clothing boutique"],
    correctAnswerIndex: 0, category: "Characters", difficulty: "hard",
    source: { url: "https://en.wikipedia.org/wiki/Step_by_Step_(TV_series)", description: "Wikipedia - Step by Step" },
    funFact: "Suzanne Somers drew on her real entrepreneurial experience for the role — she had built a successful fitness brand before joining the show."
  },
]);

// === HANGOUT SHOWS (+22) ===
topUp('the-hangout-shows.json', [
  // Friends
  {
    questionText: "What is Ross Geller's profession on Friends?",
    options: ["Paleontologist", "Archaeologist", "Geologist", "Biologist"],
    correctAnswerIndex: 0, category: "Characters", difficulty: "easy",
    source: { url: "https://en.wikipedia.org/wiki/Friends", description: "Wikipedia - Friends" },
    funFact: "David Schwimmer's real-life passion for directing led to him helming 10 episodes of Friends while starring in the show."
  },
  {
    questionText: "How many times does Ross get married on Friends?",
    options: ["Three", "Two", "Four", "One"],
    correctAnswerIndex: 0, category: "Plotlines", difficulty: "easy",
    source: { url: "https://en.wikipedia.org/wiki/Friends", description: "Wikipedia - Friends" },
    funFact: "Ross marries Carol, Emily, and Rachel. His divorces became such a running joke that the other characters lost count too."
  },
  {
    questionText: "What is Phoebe Buffay's most famous original song on Friends?",
    options: ["Smelly Cat", "Sticky Shoes", "Two of Them Kissed Last Night", "Grandma"],
    correctAnswerIndex: 0, category: "Recurring Bits", difficulty: "easy",
    source: { url: "https://en.wikipedia.org/wiki/Friends", description: "Wikipedia - Friends" },
    funFact: "Lisa Kudrow actually plays guitar. 'Smelly Cat' was written by the show's composers but Kudrow's performance made it iconic."
  },
  // Cheers
  {
    questionText: "What sport did Sam Malone play professionally before becoming a bartender on Cheers?",
    options: ["Baseball (Red Sox pitcher)", "Football", "Hockey", "Basketball"],
    correctAnswerIndex: 0, category: "Characters", difficulty: "easy",
    source: { url: "https://en.wikipedia.org/wiki/Cheers", description: "Wikipedia - Cheers" },
    funFact: "Ted Danson knew nothing about baseball. He had to take pitching lessons just to look convincing in flashback scenes."
  },
  {
    questionText: "Who replaced Shelley Long as the female lead on Cheers?",
    options: ["Kirstie Alley", "Bebe Neuwirth", "Rhea Perlman", "Woody Harrelson"],
    correctAnswerIndex: 0, category: "Behind the Scenes", difficulty: "medium",
    source: { url: "https://en.wikipedia.org/wiki/Cheers", description: "Wikipedia - Cheers" },
    funFact: "Kirstie Alley joined in Season 6 as Rebecca Howe. The show barely missed a beat — ratings actually went up after the cast change."
  },
  // Community
  {
    questionText: "What is the name of the parallel timelines episode widely considered Community's best?",
    options: ["Remedial Chaos Theory", "Modern Warfare", "Advanced Dungeons & Dragons", "Paradigms of Human Memory"],
    correctAnswerIndex: 0, category: "Plotlines", difficulty: "medium",
    source: { url: "https://en.wikipedia.org/wiki/Community_(TV_series)", description: "Wikipedia - Community" },
    funFact: "The episode creates six alternate timelines based on a dice roll. It introduced the 'darkest timeline' concept with evil goatee Abed."
  },
  {
    questionText: "What streaming platform aired Community's sixth season after NBC cancelled it?",
    options: ["Yahoo Screen", "Netflix", "Hulu", "Amazon Prime"],
    correctAnswerIndex: 0, category: "Behind the Scenes", difficulty: "hard",
    source: { url: "https://en.wikipedia.org/wiki/Community_(TV_series)", description: "Wikipedia - Community" },
    funFact: "Yahoo Screen was so obscure that most people had never heard of it. Community was essentially its only notable original show before it shut down."
  },
  // Saved by the Bell
  {
    questionText: "What was the original Disney Channel show that became Saved by the Bell?",
    options: ["Good Morning, Miss Bliss", "Hey Dude", "Salute Your Shorts", "Flash Forward"],
    correctAnswerIndex: 0, category: "Behind the Scenes", difficulty: "hard",
    source: { url: "https://en.wikipedia.org/wiki/Saved_by_the_Bell", description: "Wikipedia - Saved by the Bell" },
    funFact: "Only three characters survived the retool: Zack, Screech, and Lisa. The show was relocated from Indiana to California."
  },
  {
    questionText: "Who plays A.C. Slater on Saved by the Bell?",
    options: ["Mario Lopez", "Mark-Paul Gosselaar", "Dustin Diamond", "Dennis Haskins"],
    correctAnswerIndex: 0, category: "Behind the Scenes", difficulty: "easy",
    source: { url: "https://en.wikipedia.org/wiki/Saved_by_the_Bell", description: "Wikipedia - Saved by the Bell" },
    funFact: "Mario Lopez went on to host Extra and Access Hollywood. He's said Slater's dimples and wrestling singlet launched his entire career."
  },
  // HIMYM
  {
    questionText: "What is the name of the Mother who Ted finally meets in How I Met Your Mother?",
    options: ["Tracy McConnell", "Stella Zinman", "Victoria", "Robin Scherbatsky"],
    correctAnswerIndex: 0, category: "Characters", difficulty: "medium",
    source: { url: "https://en.wikipedia.org/wiki/How_I_Met_Your_Mother", description: "Wikipedia - HIMYM" },
    funFact: "Cristin Milioti wasn't cast until Season 8. The reveal scene at the train station had fans debating for an entire summer."
  },
  {
    questionText: "What does Barney always tell people to do before going out in How I Met Your Mother?",
    options: ["Suit up!", "Man up!", "Gear up!", "Step up!"],
    correctAnswerIndex: 0, category: "Recurring Bits", difficulty: "easy",
    source: { url: "https://en.wikipedia.org/wiki/How_I_Met_Your_Mother", description: "Wikipedia - HIMYM" },
    funFact: "Neil Patrick Harris wore over 50 different suits during the series. His contract reportedly included a personal suit consultant."
  },
  // New Girl
  {
    questionText: "What is Winston Bishop known for being terrible at on New Girl?",
    options: ["Pranks — they're either way too small or way too big", "Cooking", "Driving", "Telling jokes"],
    correctAnswerIndex: 0, category: "Recurring Bits", difficulty: "medium",
    source: { url: "https://en.wikipedia.org/wiki/New_Girl", description: "Wikipedia - New Girl" },
    funFact: "Lamorne Morris improvised most of Winston's absurd prank ideas. The writers built the 'prank sinatra' arc around his natural comedic instincts."
  },
  {
    questionText: "What is the name of Winston's beloved cat on New Girl?",
    options: ["Ferguson", "Mr. Whiskers", "Sergeant Tibbs", "Furguson"],
    correctAnswerIndex: 0, category: "Characters", difficulty: "medium",
    source: { url: "https://en.wikipedia.org/wiki/New_Girl", description: "Wikipedia - New Girl" },
    funFact: "Ferguson the cat became such a fan favorite that he got his own subplot episodes and an on-screen funeral."
  },
  // That '70s Show
  {
    questionText: "What country is Fez supposedly from on That '70s Show?",
    options: ["It's never revealed", "Brazil", "India", "Spain"],
    correctAnswerIndex: 0, category: "Recurring Bits", difficulty: "medium",
    source: { url: "https://en.wikipedia.org/wiki/That_%2770s_Show", description: "Wikipedia - That '70s Show" },
    funFact: "Every time Fez starts to say his home country's name, he's interrupted. His name 'Fez' stands for 'Foreign Exchange Student.'"
  },
  {
    questionText: "Which two That '70s Show actors married each other in real life?",
    options: ["Ashton Kutcher and Mila Kunis", "Topher Grace and Laura Prepon", "Danny Masterson and Laura Prepon", "Wilmer Valderrama and Mila Kunis"],
    correctAnswerIndex: 0, category: "Behind the Scenes", difficulty: "easy",
    source: { url: "https://en.wikipedia.org/wiki/That_%2770s_Show", description: "Wikipedia - That '70s Show" },
    funFact: "Kutcher and Kunis didn't start dating until 2012, over six years after the show ended. Their first kiss was actually on the show when Kunis was 14."
  },
  // Martin
  {
    questionText: "Who plays Martin Payne's girlfriend and later wife Gina on Martin?",
    options: ["Tisha Campbell", "Tichina Arnold", "Vivica A. Fox", "Nia Long"],
    correctAnswerIndex: 0, category: "Behind the Scenes", difficulty: "medium",
    source: { url: "https://en.wikipedia.org/wiki/Martin_(TV_series)", description: "Wikipedia - Martin" },
    funFact: "Tisha Campbell filed a harassment lawsuit against Martin Lawrence in 1997, which led to her reduced appearances in the final season."
  },
  {
    questionText: "What talk show does Martin host later in the series Martin?",
    options: ["Word on the Street", "Martin's World", "The Real Talk", "Detroit Live"],
    correctAnswerIndex: 0, category: "Plotlines", difficulty: "hard",
    source: { url: "https://en.wikipedia.org/wiki/Martin_(TV_series)", description: "Wikipedia - Martin" },
    funFact: "The career change from radio DJ to talk show host mirrored Martin Lawrence's own rising fame during the show's run."
  },
  // Scrubs
  {
    questionText: "What real medical school's experiences inspired the creation of Scrubs?",
    options: ["Brown Medical School", "Harvard Medical School", "Johns Hopkins", "Stanford Medical"],
    correctAnswerIndex: 0, category: "Behind the Scenes", difficulty: "hard",
    source: { url: "https://en.wikipedia.org/wiki/Scrubs_(TV_series)", description: "Wikipedia - Scrubs" },
    funFact: "Creator Bill Lawrence's friend Dr. Jonathan Doris served as a medical consultant. Many plots were based on Doris's real residency experiences."
  },
  {
    questionText: "What does the Janitor claim his name is at different points in Scrubs?",
    options: ["Different names each time, finally revealed as Glenn Matthews", "He refuses to give any name", "He only goes by 'Janitor'", "His name is revealed in episode 1"],
    correctAnswerIndex: 0, category: "Characters", difficulty: "hard",
    source: { url: "https://en.wikipedia.org/wiki/Scrubs_(TV_series)", description: "Wikipedia - Scrubs" },
    funFact: "Neil Flynn improvised so much that the writers sometimes just wrote 'Whatever Neil says' in the script."
  },
  // Big Bang Theory
  {
    questionText: "What is Howard Wolowitz's unique distinction among the main group in Big Bang Theory?",
    options: ["He only has a master's degree, not a PhD", "He's the tallest", "He doesn't work at Caltech", "He's the oldest"],
    correctAnswerIndex: 0, category: "Characters", difficulty: "medium",
    source: { url: "https://en.wikipedia.org/wiki/The_Big_Bang_Theory", description: "Wikipedia - The Big Bang Theory" },
    funFact: "The other characters constantly mock Howard's MIT master's degree. Despite this, he's the only one who actually goes to space."
  },
  {
    questionText: "What is Penny's last name on The Big Bang Theory?",
    options: ["It was never revealed during the original run", "Hofstadter", "Johnson", "Smith"],
    correctAnswerIndex: 0, category: "Recurring Bits", difficulty: "hard",
    source: { url: "https://en.wikipedia.org/wiki/The_Big_Bang_Theory", description: "Wikipedia - The Big Bang Theory" },
    funFact: "Penny's maiden name was kept a mystery for all 12 seasons. She became Penny Hofstadter after marrying Leonard, but her birth surname was never said on screen."
  },
]);

// === SMART-ASS SHOWS (+25) ===
topUp('the-smart-ass-shows.json', [
  // Frasier
  {
    questionText: "What is the name of Frasier's radio show on Frasier?",
    options: ["The Dr. Frasier Crane Show", "Seattle Talks", "Mind Over Matter", "The Listening Hour"],
    correctAnswerIndex: 0, category: "Plotlines", difficulty: "easy",
    source: { url: "https://en.wikipedia.org/wiki/Frasier", description: "Wikipedia - Frasier" },
    funFact: "Callers on Frasier's show were voiced by celebrity guests including Mel Brooks, Elijah Wood, and Eddie Van Halen."
  },
  {
    questionText: "What is the name of Martin Crane's Jack Russell Terrier on Frasier?",
    options: ["Eddie", "Sparky", "Biscuit", "Rascal"],
    correctAnswerIndex: 0, category: "Characters", difficulty: "easy",
    source: { url: "https://en.wikipedia.org/wiki/Frasier", description: "Wikipedia - Frasier" },
    funFact: "Eddie was played by a dog named Moose, who received more fan mail than any human cast member on the show."
  },
  // Arrested Development
  {
    questionText: "How much money does George Sr. hide inside the banana stand walls in Arrested Development?",
    options: ["$250,000", "$100,000", "$1 million", "$50,000"],
    correctAnswerIndex: 0, category: "Plotlines", difficulty: "medium",
    source: { url: "https://en.wikipedia.org/wiki/Arrested_Development_(TV_series)", description: "Wikipedia - Arrested Development" },
    funFact: "Michael burns down the banana stand before learning the money is inside — one of the show's greatest early ironic moments."
  },
  // Veep
  {
    questionText: "How does Selina Meyer become President in Veep?",
    options: ["The sitting president resigns", "She wins an election", "The president dies", "She stages a coup"],
    correctAnswerIndex: 0, category: "Plotlines", difficulty: "medium",
    source: { url: "https://en.wikipedia.org/wiki/Veep", description: "Wikipedia - Veep" },
    funFact: "The show deliberately never names Selina's political party, so neither Democrats nor Republicans could claim ownership of her chaos."
  },
  // 30 Rock
  {
    questionText: "How many Primetime Emmy Awards did 30 Rock win?",
    options: ["16", "22", "10", "28"],
    correctAnswerIndex: 0, category: "Behind the Scenes", difficulty: "hard",
    source: { url: "https://en.wikipedia.org/wiki/30_Rock", description: "Wikipedia - 30 Rock" },
    funFact: "30 Rock competed with The Office for Emmys almost every year. Tina Fey and Steve Carell reportedly had a friendly rivalry about it."
  },
  // Archer
  {
    questionText: "What is the relationship between Sterling Archer and Malory Archer?",
    options: ["Mother and son", "Husband and wife", "Siblings", "Boss and employee only"],
    correctAnswerIndex: 0, category: "Characters", difficulty: "easy",
    source: { url: "https://en.wikipedia.org/wiki/Archer_(TV_series)", description: "Wikipedia - Archer" },
    funFact: "Jessica Walter voiced Malory Archer after playing Lucille Bluth — two of TV's most formidable fictional mothers."
  },
  {
    questionText: "What word does Archer say when someone makes an unintentional innuendo?",
    options: ["Phrasing!", "Innuendo!", "Wording!", "Context!"],
    correctAnswerIndex: 0, category: "Recurring Bits", difficulty: "easy",
    source: { url: "https://en.wikipedia.org/wiki/Archer_(TV_series)", description: "Wikipedia - Archer" },
    funFact: "In later seasons, Archer complains that nobody says 'phrasing' anymore — making the absence of the catchphrase itself a running gag."
  },
  // Gilmore Girls
  {
    questionText: "What preparatory school does Rory attend before Yale in Gilmore Girls?",
    options: ["Chilton", "Dalton", "Exeter", "Phillips"],
    correctAnswerIndex: 0, category: "Plotlines", difficulty: "medium",
    source: { url: "https://en.wikipedia.org/wiki/Gilmore_Girls", description: "Wikipedia - Gilmore Girls" },
    funFact: "Chilton's name was inspired by a real school. The Friday dinners with Emily and Richard were the price Lorelai paid for Rory's tuition."
  },
  {
    questionText: "What inn do Lorelai and Sookie open together in Gilmore Girls?",
    options: ["The Dragonfly Inn", "The Stars Hollow Inn", "The Gilmore Inn", "The Independence Inn"],
    correctAnswerIndex: 0, category: "Plotlines", difficulty: "medium",
    source: { url: "https://en.wikipedia.org/wiki/Gilmore_Girls", description: "Wikipedia - Gilmore Girls" },
    funFact: "The Dragonfly Inn set was so detailed that the production designer created a full guest book with fictional entries."
  },
  // The Good Place
  {
    questionText: "Who created The Good Place?",
    options: ["Michael Schur", "Dan Harmon", "Tina Fey", "Greg Daniels"],
    correctAnswerIndex: 0, category: "Behind the Scenes", difficulty: "medium",
    source: { url: "https://en.wikipedia.org/wiki/The_Good_Place", description: "Wikipedia - The Good Place" },
    funFact: "Michael Schur also created Parks and Rec and co-created Brooklyn Nine-Nine. He consulted actual philosophy professors for The Good Place scripts."
  },
  {
    questionText: "What did Ted Danson play on The Good Place before being famous for Cheers?",
    options: ["He was already famous for Cheers — he plays the demon Michael", "A bartender", "An angel", "A judge"],
    correctAnswerIndex: 0, category: "Characters", difficulty: "easy",
    source: { url: "https://en.wikipedia.org/wiki/The_Good_Place", description: "Wikipedia - The Good Place" },
    funFact: "Casting Ted Danson as a demon architect was deliberate — his warm, trustworthy persona from Cheers made the Season 1 twist hit harder."
  },
  // Schitt's Creek
  {
    questionText: "What real-life relationship do Eugene Levy and Dan Levy share on and off Schitt's Creek?",
    options: ["Father and son", "Brothers", "Uncle and nephew", "No relation"],
    correctAnswerIndex: 0, category: "Behind the Scenes", difficulty: "easy",
    source: { url: "https://en.wikipedia.org/wiki/Schitt%27s_Creek", description: "Wikipedia - Schitt's Creek" },
    funFact: "Dan pitched the show to his dad Eugene over dinner. Eugene agreed on the spot, and they co-created the entire series together."
  },
  {
    questionText: "What cooking instruction baffles David and Moira in an iconic Schitt's Creek scene?",
    options: ["Fold in the cheese", "Whisk until stiff peaks", "Deglaze the pan", "Blanch the vegetables"],
    correctAnswerIndex: 0, category: "Recurring Bits", difficulty: "easy",
    source: { url: "https://en.wikipedia.org/wiki/Schitt%27s_Creek", description: "Wikipedia - Schitt's Creek" },
    funFact: "The 'fold in the cheese' scene was improvised by Catherine O'Hara and Dan Levy. It took multiple takes because the crew kept laughing."
  },
  {
    questionText: "Where does the Rose family live after losing their fortune in Schitt's Creek?",
    options: ["The Rosebud Motel", "A trailer park", "The town hall basement", "A friend's guest house"],
    correctAnswerIndex: 0, category: "Plotlines", difficulty: "easy",
    source: { url: "https://en.wikipedia.org/wiki/Schitt%27s_Creek", description: "Wikipedia - Schitt's Creek" },
    funFact: "The Rosebud Motel exterior is a real motel in Orangeville, Ontario. After the show, it became a tourist destination."
  },
  // Psych
  {
    questionText: "What skill does Shawn Spencer actually use while pretending to be psychic on Psych?",
    options: ["Eidetic memory and keen observation", "Cold reading techniques", "Actual psychic ability", "He guesses and gets lucky"],
    correctAnswerIndex: 0, category: "Characters", difficulty: "easy",
    source: { url: "https://en.wikipedia.org/wiki/Psych", description: "Wikipedia - Psych" },
    funFact: "Shawn's dad Henry (Corbin Bernsen) trained him from childhood to notice details. The flashback training scenes are fan favorites."
  },
  {
    questionText: "How many Psych movies have been made after the series ended?",
    options: ["Three", "One", "Two", "Four"],
    correctAnswerIndex: 0, category: "Behind the Scenes", difficulty: "medium",
    source: { url: "https://en.wikipedia.org/wiki/Psych", description: "Wikipedia - Psych" },
    funFact: "Psych: The Movie (2017), Lassie Come Home (2020), and This Is Gus (2021) brought the full cast back together each time."
  },
  // Derry Girls
  {
    questionText: "What real-life event does the Derry Girls series finale coincide with?",
    options: ["The Good Friday Agreement vote", "The fall of the Berlin Wall", "Princess Diana's funeral", "The Omagh bombing"],
    correctAnswerIndex: 0, category: "Plotlines", difficulty: "hard",
    source: { url: "https://en.wikipedia.org/wiki/Derry_Girls", description: "Wikipedia - Derry Girls" },
    funFact: "The finale's shift from comedy to the real historical vote was so moving that it received a standing ovation at its premiere screening."
  },
  {
    questionText: "What record did Derry Girls break for Channel 4?",
    options: ["Most successful comedy since Father Ted", "Highest-rated premiere ever", "Most international sales", "Longest-running sitcom"],
    correctAnswerIndex: 0, category: "Behind the Scenes", difficulty: "hard",
    source: { url: "https://en.wikipedia.org/wiki/Derry_Girls", description: "Wikipedia - Derry Girls" },
    funFact: "In Northern Ireland, the show drew larger audiences per capita than Game of Thrones. It became a cultural touchstone overnight."
  },
  // Letterkenny
  {
    questionText: "What does 'ten-ply' mean in Letterkenny slang?",
    options: ["Someone who is soft or weak", "Someone who is tough", "A liar", "A hard worker"],
    correctAnswerIndex: 0, category: "Recurring Bits", difficulty: "medium",
    source: { url: "https://en.wikipedia.org/wiki/Letterkenny_(TV_series)", description: "Wikipedia - Letterkenny" },
    funFact: "Like toilet paper ply count — the more plies, the softer. Letterkenny invented dozens of similar insults based on everyday objects."
  },
  {
    questionText: "What is Wayne's status in the town of Letterkenny?",
    options: ["The toughest guy in Letterkenny", "The mayor", "The richest farmer", "The oldest resident"],
    correctAnswerIndex: 0, category: "Characters", difficulty: "easy",
    source: { url: "https://en.wikipedia.org/wiki/Letterkenny_(TV_series)", description: "Wikipedia - Letterkenny" },
    funFact: "Wayne defends his title as the toughest guy in Letterkenny throughout the series. Challengers regularly show up at the end of the laneway."
  },
  // Community
  {
    questionText: "What happens to showrunner Dan Harmon during Community's run?",
    options: ["He was fired for Season 4 then rehired for Season 5", "He left voluntarily", "He stayed for all 6 seasons", "He was replaced permanently"],
    correctAnswerIndex: 0, category: "Behind the Scenes", difficulty: "hard",
    source: { url: "https://en.wikipedia.org/wiki/Community_(TV_series)", description: "Wikipedia - Community" },
    funFact: "Fans call Season 4 'the gas leak year' — a reference the show itself used to dismiss the out-of-character season when Harmon returned."
  },
]);

// === WORKPLACE SHOWS (+26) ===
topUp('the-workplace-shows.json', [
  // The Office
  {
    questionText: "What game do the Dunder Mifflin employees play at the annual company party in The Office?",
    options: ["The Dundies", "Office Olympics", "Flonkerton", "Café Disco"],
    correctAnswerIndex: 0, category: "Recurring Bits", difficulty: "easy",
    source: { url: "https://en.wikipedia.org/wiki/The_Office_(American_TV_series)", description: "Wikipedia - The Office" },
    funFact: "The Dundies are Michael's self-created award ceremony held at Chili's. Pam gets drunk and banned from the restaurant."
  },
  {
    questionText: "Who becomes Regional Manager after Michael Scott leaves The Office?",
    options: ["Andy Bernard", "Dwight Schrute", "Jim Halpert", "Robert California"],
    correctAnswerIndex: 0, category: "Plotlines", difficulty: "medium",
    source: { url: "https://en.wikipedia.org/wiki/The_Office_(American_TV_series)", description: "Wikipedia - The Office" },
    funFact: "Andy's tenure as manager was deliberately written as a disaster. Dwight finally gets the job in the series finale."
  },
  // Parks and Rec
  {
    questionText: "What is Ron Swanson's favorite food in Parks and Recreation?",
    options: ["All of the bacon and eggs", "Steak", "Ribs", "Burgers"],
    correctAnswerIndex: 0, category: "Recurring Bits", difficulty: "easy",
    source: { url: "https://en.wikipedia.org/wiki/Parks_and_Recreation", description: "Wikipedia - Parks and Recreation" },
    funFact: "Nick Offerman is actually a woodworker in real life, just like Ron. But unlike Ron, Offerman is not a heavy meat eater."
  },
  {
    questionText: "What secret identity does Ron Swanson maintain as a jazz musician in Parks and Rec?",
    options: ["Duke Silver", "Ron Gold", "Sax Man", "Mr. Smooth"],
    correctAnswerIndex: 0, category: "Characters", difficulty: "medium",
    source: { url: "https://en.wikipedia.org/wiki/Parks_and_Recreation", description: "Wikipedia - Parks and Recreation" },
    funFact: "Nick Offerman actually plays saxophone. The Duke Silver performances use his real playing, not a double."
  },
  // Brooklyn Nine-Nine
  {
    questionText: "What is the name of Jake Peralta's arch-nemesis in Brooklyn Nine-Nine?",
    options: ["Doug Judy, the Pontiac Bandit", "The Vulture", "Figgis", "Wuntch"],
    correctAnswerIndex: 0, category: "Characters", difficulty: "medium",
    source: { url: "https://en.wikipedia.org/wiki/Brooklyn_Nine-Nine", description: "Wikipedia - Brooklyn Nine-Nine" },
    funFact: "Craig Robinson's Doug Judy was only supposed to appear once but became a fan-favorite recurring character who shows up every season."
  },
  {
    questionText: "What running gag involves Charles Boyle's adopted son's name in Brooklyn Nine-Nine?",
    options: ["Everyone mispronounces 'Nikolaj'", "He keeps changing the name", "The son corrects everyone", "Nobody remembers the name"],
    correctAnswerIndex: 0, category: "Recurring Bits", difficulty: "medium",
    source: { url: "https://en.wikipedia.org/wiki/Brooklyn_Nine-Nine", description: "Wikipedia - Brooklyn Nine-Nine" },
    funFact: "The 'Nikolaj' pronunciation gag was Joe Lo Truglio's idea. Each actor deliberately says it differently every time."
  },
  // Superstore
  {
    questionText: "In what city is the Cloud 9 store located in Superstore?",
    options: ["St. Louis, Missouri", "Dayton, Ohio", "Des Moines, Iowa", "Omaha, Nebraska"],
    correctAnswerIndex: 0, category: "Plotlines", difficulty: "medium",
    source: { url: "https://en.wikipedia.org/wiki/Superstore_(TV_series)", description: "Wikipedia - Superstore" },
    funFact: "The pilot was filmed in an actual Kmart in Burbank, California before they built a permanent set."
  },
  {
    questionText: "Who serves as a surrogate mother for Glenn and Jerusha's child in Superstore?",
    options: ["Dina Fox", "Amy Dubanowski", "Cheyenne", "Sandra"],
    correctAnswerIndex: 0, category: "Plotlines", difficulty: "hard",
    source: { url: "https://en.wikipedia.org/wiki/Superstore_(TV_series)", description: "Wikipedia - Superstore" },
    funFact: "Lauren Ash played the surrogacy storyline with such commitment that the writers expanded Dina's role significantly in later seasons."
  },
  // NewsRadio
  {
    questionText: "Who replaced Phil Hartman on NewsRadio after his death?",
    options: ["Jon Lovitz", "Norm MacDonald", "David Spade", "Chris Rock"],
    correctAnswerIndex: 0, category: "Behind the Scenes", difficulty: "medium",
    source: { url: "https://en.wikipedia.org/wiki/NewsRadio", description: "Wikipedia - NewsRadio" },
    funFact: "Lovitz took the role as a tribute to his close friend Hartman. The Season 5 premiere where the cast grieves Bill is considered one of TV's most moving episodes."
  },
  // Abbott Elementary
  {
    questionText: "What questionable connections does teacher Melissa Schemmenti have in Abbott Elementary?",
    options: ["Implied mob ties in South Philly", "She's a former spy", "She's in witness protection", "She's a retired cop"],
    correctAnswerIndex: 0, category: "Characters", difficulty: "medium",
    source: { url: "https://en.wikipedia.org/wiki/Abbott_Elementary", description: "Wikipedia - Abbott Elementary" },
    funFact: "Lisa Ann Walter drew on her real Italian-American South Philly roots. She says Melissa's 'connections' are based on people she actually knows."
  },
  {
    questionText: "What format does Abbott Elementary use to tell its story?",
    options: ["Mockumentary with talking heads", "Traditional multi-camera", "Single-camera with narration", "Animated segments"],
    correctAnswerIndex: 0, category: "Behind the Scenes", difficulty: "easy",
    source: { url: "https://en.wikipedia.org/wiki/Abbott_Elementary", description: "Wikipedia - Abbott Elementary" },
    funFact: "The mockumentary format was inspired by The Office. Quinta Brunson has said she wanted to do for teachers what The Office did for office workers."
  },
  // Workaholics
  {
    questionText: "What is the name of the telemarketing company in Workaholics?",
    options: ["TelAmeriCorp", "CallMax", "PhonePros Inc.", "AmeriCall"],
    correctAnswerIndex: 0, category: "Plotlines", difficulty: "medium",
    source: { url: "https://en.wikipedia.org/wiki/Workaholics", description: "Wikipedia - Workaholics" },
    funFact: "The writers drew on their own experiences doing awful jobs. Several early plots were based on things that actually happened to them."
  },
  {
    questionText: "Who plays the recurring character Karl on Workaholics and also directed most episodes?",
    options: ["Kyle Newacheck", "Blake Anderson", "Anders Holm", "Adam DeVine"],
    correctAnswerIndex: 0, category: "Behind the Scenes", difficulty: "hard",
    source: { url: "https://en.wikipedia.org/wiki/Workaholics", description: "Wikipedia - Workaholics" },
    funFact: "Newacheck went from directing Workaholics to directing episodes of Brooklyn Nine-Nine and the film Murder Mystery with Adam Sandler."
  },
  // Better Off Ted
  {
    questionText: "What does Ted Crisp regularly do to address the audience in Better Off Ted?",
    options: ["Breaks the fourth wall and narrates directly", "Writes in a journal", "Records video diaries", "Talks to his daughter"],
    correctAnswerIndex: 0, category: "Recurring Bits", difficulty: "medium",
    source: { url: "https://en.wikipedia.org/wiki/Better_Off_Ted", description: "Wikipedia - Better Off Ted" },
    funFact: "The fourth-wall breaks gave the show a confessional tone that critics compared favorably to Arrested Development."
  },
  {
    questionText: "What are the names of the inseparable lab scientist duo in Better Off Ted?",
    options: ["Phil and Lem", "Bill and Ted", "Rick and Morty", "Dan and Steve"],
    correctAnswerIndex: 0, category: "Characters", difficulty: "hard",
    source: { url: "https://en.wikipedia.org/wiki/Better_Off_Ted", description: "Wikipedia - Better Off Ted" },
    funFact: "Jonathan Slavin and Malcolm Barrett's chemistry was so natural that many of their best scenes were improvised."
  },
  // The IT Crowd
  {
    questionText: "Who takes over as head of Reynholm Industries after Denholm's departure on The IT Crowd?",
    options: ["His son Douglas Reynholm", "Roy", "Moss", "Jen"],
    correctAnswerIndex: 0, category: "Plotlines", difficulty: "medium",
    source: { url: "https://en.wikipedia.org/wiki/The_IT_Crowd", description: "Wikipedia - The IT Crowd" },
    funFact: "Matt Berry's portrayal of the absurd Douglas Reynholm became so iconic it launched his career into Toast of London and What We Do in the Shadows."
  },
  {
    questionText: "How many series (seasons) did The IT Crowd run for?",
    options: ["4 series plus a special", "6 series", "3 series", "2 series"],
    correctAnswerIndex: 0, category: "Behind the Scenes", difficulty: "medium",
    source: { url: "https://en.wikipedia.org/wiki/The_IT_Crowd", description: "Wikipedia - The IT Crowd" },
    funFact: "British sitcom series are much shorter than American ones. The IT Crowd's entire run of 25 episodes is less than one American season."
  },
  // Extras
  {
    questionText: "Who plays Andy Millman's hopelessly incompetent agent in Extras?",
    options: ["Stephen Merchant", "Ricky Gervais", "Karl Pilkington", "Warwick Davis"],
    correctAnswerIndex: 0, category: "Characters", difficulty: "medium",
    source: { url: "https://en.wikipedia.org/wiki/Extras_(TV_series)", description: "Wikipedia - Extras" },
    funFact: "Merchant co-created the show with Gervais. At 6'7\", his physical comedy as the bumbling agent Darren Lamb is amplified by his towering height."
  },
  {
    questionText: "What award did Extras win at the Golden Globes?",
    options: ["Best TV Comedy Series", "Best Actor", "Best Supporting Actress", "Best Screenplay"],
    correctAnswerIndex: 0, category: "Behind the Scenes", difficulty: "hard",
    source: { url: "https://en.wikipedia.org/wiki/Extras_(TV_series)", description: "Wikipedia - Extras" },
    funFact: "Extras only ran for 13 episodes total — two 6-episode series plus a Christmas special. Gervais prefers short runs to avoid overstaying."
  },
  // 30 Rock
  {
    questionText: "What real NBC show is 30 Rock based on Tina Fey's experience running?",
    options: ["Saturday Night Live", "The Tonight Show", "Late Night", "Today"],
    correctAnswerIndex: 0, category: "Behind the Scenes", difficulty: "easy",
    source: { url: "https://en.wikipedia.org/wiki/30_Rock", description: "Wikipedia - 30 Rock" },
    funFact: "30 Rock premiered the same year as Studio 60 on the Sunset Strip, another SNL-inspired show by Aaron Sorkin. Only 30 Rock survived."
  },
  // Scrubs
  {
    questionText: "What network picked up Scrubs for its final two seasons after NBC dropped it?",
    options: ["ABC", "Fox", "CBS", "The CW"],
    correctAnswerIndex: 0, category: "Behind the Scenes", difficulty: "hard",
    source: { url: "https://en.wikipedia.org/wiki/Scrubs_(TV_series)", description: "Wikipedia - Scrubs" },
    funFact: "Season 9 on ABC was essentially a soft reboot with new med students. Most fans consider Season 8's finale the true ending."
  },
]);

console.log('\nFinal counts:');
for (const f of ['the-family-shows.json','the-hangout-shows.json','the-nothing-shows.json','the-smart-ass-shows.json','the-workplace-shows.json']) {
  const d = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'packs', f), 'utf-8'));
  console.log(`  ${d.name}: ${d.questions.length}`);
}
