// https://learn.microsoft.com/en-us/bing/search-apis/bing-web-search/reference/response-objects#searchresponse

// Basic Types
type UnsignedShort = number; // Assuming this will be a non-negative integer

// Attribution
interface Attribution {
    providerDisplayName: string;
    seeMoreUrl: string;
}

// Computation
interface Computation {
    expression: string;
    value: string;
}

// Error
interface Error {
    code: string;
    message: string;
    moreDetails: string;
    parameter: string;
    subCode: string;
    value: string;
}

// ErrorResponse
interface ErrorResponse {
    _type: "ErrorResponse";
    errors: Error[];
}

// Identifiable
interface Identifiable {
    id: string;
}

// Image
interface Image {
    height: UnsignedShort;
    hostPageUrl: string;
    name?: string;
    provider: Organization[];
    thumbnailUrl: string;
    width: UnsignedShort;
}

// License
interface License {
    name: string;
    url: string;
}

// LicenseAttribution
interface LicenseAttribution {
    _type: "LicenseAttribution";
    license: License;
    licenseNotice: string;
    mustBeCloseToContent: boolean;
    targetPropertyName: string;
}

// LinkAttribution
interface LinkAttribution {
    _type: "LinkAttribution";
    mustBeCloseToContent: boolean;
    targetPropertyName: string;
    text: string;
    url: string;
}

// Malware
interface Malware {
    beSafeRxUrl: string;
    malwareWarningType: string;
    warningExplanationUrl: string;
    warningLetterUrl: string;
}

// MediaAttribution
interface MediaAttribution {
    _type: "MediaAttribution";
    mustBeCloseToContent: boolean;
    targetPropertyName: string;
    url: string;
}

// MetaTag
interface MetaTag {
    content: string;
    name: string;
}

// Organization
interface Organization {
    name: string;
    url: string;
}

// Query
interface Query {
    displayText: string;
    text: string;
    webSearchUrl: string;
}

// QueryContext
interface QueryContext {
    adultIntent: boolean;
    alterationOverrideQuery?: string;
    alteredQuery?: string;
    askUserForLocation: boolean;
    originalQuery: string;
}

// RankingGroup
interface RankingGroup {
    items: RankingItem[];
}

// RankingItem
interface RankingItem {
    answerType: string;
    resultIndex?: number;
    value: Identifiable;
}

// RankingResponse
interface RankingResponse {
    mainline: RankingGroup;
    pole: RankingGroup;
    sidebar: RankingGroup;
}

// RelatedSearchAnswer
interface RelatedSearchAnswer {
    id: string;
    value: Query[];
}

// SearchResponse
interface SearchResponse {
    _type: "SearchResponse";
    computation?: Computation;
    entities?: EntityAnswer;
    images?: ImageAnswer;
    news?: NewsAnswer;
    places?: LocalEntityAnswer;
    queryContext: QueryContext;
    rankingResponse: RankingResponse;
    relatedSearches?: RelatedSearchAnswer;
    spellSuggestions?: SpellSuggestions;
    timeZone?: TimeZone;
    translations?: TranslationAnswer;
    videos?: VideosAnswer;
    webPages?: WebAnswer;
}

// SpellSuggestions
interface SpellSuggestions {
    id: string;
    value: Query[];
}

// TimeZone
interface TimeZone {
    date: string;
    description: string;
    otherCityTimes: TimeZoneInformation[];
    primaryCityTime: TimeZoneInformation;
    primaryResponse: string;
    primaryTimeZone: TimeZoneInformation;
    timeZoneDifference: TimeZoneDifference;
}

// TimeZoneDifference
interface TimeZoneDifference {
    location1: TimeZoneInformation;
    location2: TimeZoneInformation;
    text: string;
}

// TimeZoneInformation
interface TimeZoneInformation {
    location: string;
    time: string;
    timeZoneName: string;
    utcOffset: string;
}

// TranslationAnswer
interface TranslationAnswer {
    attributions: Attribution[];
    contractualRules?: object[];
    id: string;
    inLanguage: string;
    originalText: string;
    translatedLanguageName: string;
    translatedText: string;
}

// WebAnswer
interface WebAnswer {
    id: string;
    someResultsRemoved: boolean;
    totalEstimatedMatches: number;
    value: WebPage[];
    webSearchUrl: string;
}

// WebPage
interface WebPage {
    about?: object[];
    dateLastCrawled: string;
    datePublished: string;
    datePublishedDisplayText: string;
    contractualRules?: object[];
    deepLinks?: WebPage[];
    displayUrl: string;
    id: string;
    isFamilyFriendly: boolean;
    isNavigational: boolean;
    language: string;
    malware?: Malware;
    name: string;
    searchTags?: MetaTag[];
    snippet: string;
    url: string;
}

// TextAttribution
interface TextAttribution {
    _type: "TextAttribution";
    text: string;
}