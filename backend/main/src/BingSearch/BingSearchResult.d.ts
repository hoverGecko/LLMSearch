// https://learn.microsoft.com/en-us/bing/search-apis/bing-web-search/reference/response-objects#searchresponse

// Basic Types
export type UnsignedShort = number; // Assuming this will be a non-negative integer

// Attribution
export interface Attribution {
    providerDisplayName: string;
    seeMoreUrl: string;
}

// Computation
export interface Computation {
    expression: string;
    value: string;
}

// Error
export interface Error {
    code: string;
    message: string;
    moreDetails: string;
    parameter: string;
    subCode: string;
    value: string;
}

// ErrorResponse
export interface ErrorResponse {
    _type: "ErrorResponse";
    errors: Error[];
}

// Identifiable
export interface Identifiable {
    id: string;
}

// Image
export interface Image {
    height: UnsignedShort;
    hostPageUrl: string;
    name?: string;
    provider: Organization[];
    thumbnailUrl: string;
    width: UnsignedShort;
}

// License
export interface License {
    name: string;
    url: string;
}

// LicenseAttribution
export interface LicenseAttribution {
    _type: "LicenseAttribution";
    license: License;
    licenseNotice: string;
    mustBeCloseToContent: boolean;
    targetPropertyName: string;
}

// LinkAttribution
export interface LinkAttribution {
    _type: "LinkAttribution";
    mustBeCloseToContent: boolean;
    targetPropertyName: string;
    text: string;
    url: string;
}

// Malware
export interface Malware {
    beSafeRxUrl: string;
    malwareWarningType: string;
    warningExplanationUrl: string;
    warningLetterUrl: string;
}

// MediaAttribution
export interface MediaAttribution {
    _type: "MediaAttribution";
    mustBeCloseToContent: boolean;
    targetPropertyName: string;
    url: string;
}

// MetaTag
export interface MetaTag {
    content: string;
    name: string;
}

// Organization
export interface Organization {
    name: string;
    url: string;
}

// Query
export interface Query {
    displayText: string;
    text: string;
    webSearchUrl: string;
}

// QueryContext
export interface QueryContext {
    adultIntent: boolean;
    alterationOverrideQuery?: string;
    alteredQuery?: string;
    askUserForLocation: boolean;
    originalQuery: string;
}

// RankingGroup
export interface RankingGroup {
    items: RankingItem[];
}

// RankingItem
export interface RankingItem {
    answerType: string;
    resultIndex?: number;
    value: Identifiable;
}

// RankingResponse
export interface RankingResponse {
    mainline: RankingGroup;
    pole: RankingGroup;
    sidebar: RankingGroup;
}

// RelatedSearchAnswer
export interface RelatedSearchAnswer {
    id: string;
    value: Query[];
}

// SearchResponse
export interface SearchResponse {
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
export interface SpellSuggestions {
    id: string;
    value: Query[];
}

// TimeZone
export interface TimeZone {
    date: string;
    description: string;
    otherCityTimes: TimeZoneInformation[];
    primaryCityTime: TimeZoneInformation;
    primaryResponse: string;
    primaryTimeZone: TimeZoneInformation;
    timeZoneDifference: TimeZoneDifference;
}

// TimeZoneDifference
export interface TimeZoneDifference {
    location1: TimeZoneInformation;
    location2: TimeZoneInformation;
    text: string;
}

// TimeZoneInformation
export interface TimeZoneInformation {
    location: string;
    time: string;
    timeZoneName: string;
    utcOffset: string;
}

// TranslationAnswer
export interface TranslationAnswer {
    attributions: Attribution[];
    contractualRules?: object[];
    id: string;
    inLanguage: string;
    originalText: string;
    translatedLanguageName: string;
    translatedText: string;
}

// WebAnswer
export interface WebAnswer {
    id: string;
    someResultsRemoved: boolean;
    totalEstimatedMatches: number;
    value: WebPage[];
    webSearchUrl: string;
}

// WebPage
export interface WebPage {
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
export interface TextAttribution {
    _type: "TextAttribution";
    text: string;
}
