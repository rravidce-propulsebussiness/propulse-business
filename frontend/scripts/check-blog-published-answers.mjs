import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { HYDERABAD_HOMEOWNER_TOPIC_GROUPS } from '../src/seo/hyderabadHomeownerTopics.js'
import { INTERIOR_HOMEOWNER_TOPIC_GROUPS } from '../src/seo/interiorHomeownerTopics.js'
import { PUBLISHED_HOMEOWNER_ANSWERS } from '../src/seo/homeownerPublishedAnswers.js'

const allGroups = [...HYDERABAD_HOMEOWNER_TOPIC_GROUPS, ...INTERIOR_HOMEOWNER_TOPIC_GROUPS]
const allTopics = allGroups.flatMap(group => group.topics)
const topicCounts = new Map()
for (const topic of allTopics) topicCounts.set(topic.title, (topicCounts.get(topic.title) || 0) + 1)

const missingFromDirectory = Object.keys(PUBLISHED_HOMEOWNER_ANSWERS).filter(title => !topicCounts.has(title))
assert.deepEqual(missingFromDirectory, [], 'Every published answer must have a topic-directory entry so it can appear on a blog page.')

const constructionGroups = HYDERABAD_HOMEOWNER_TOPIC_GROUPS.filter(group => group.category !== 'Interior design & renovation searches')
const constructionTitles = constructionGroups.flatMap(group => group.topics.map(topic => topic.title))
const repeatedConstructionTopics = [...new Set(constructionTitles.filter((title, index) => constructionTitles.indexOf(title) !== index))]
assert.deepEqual(repeatedConstructionTopics, [], 'Construction blog topic titles must not be duplicated across categories.')

const blogSource = await readFile(new URL('../src/pages/Blog.jsx', import.meta.url), 'utf8')
assert.ok(blogSource.includes('PUBLISHED_HOMEOWNER_ANSWERS[topic.title]'), 'Blog page must resolve published answers by topic title.')
assert.ok(blogSource.includes('{published.answer}'), 'Blog page must render the complete published answer.')
assert.ok(blogSource.includes('published.sources.map'), 'Blog page must render source links when references are provided.')

const constructionPublishedCount = constructionTitles.filter(title => PUBLISHED_HOMEOWNER_ANSWERS[title]?.answer).length
const interiorPublishedCount = allTopics
  .filter(topic => !constructionTitles.includes(topic.title) && PUBLISHED_HOMEOWNER_ANSWERS[topic.title]?.answer)
  .length

console.log(`Blog published-answer coverage passed: ${Object.keys(PUBLISHED_HOMEOWNER_ANSWERS).length} answers are listed; ${constructionPublishedCount} construction answers and ${interiorPublishedCount} interior answers are connected to blog topics.`)
