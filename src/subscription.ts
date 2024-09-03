import { DidResolver, MemoryCache } from '@atproto/identity'
import {
  OutputSchema as RepoEvent,
  isCommit,
} from './lexicon/types/com/atproto/sync/subscribeRepos'
import { FirehoseSubscriptionBase, getOpsByType } from './util/subscription'
import { allTerms, excludeTerms, regex, communitySubdomains, dids } from './util/subscription-filters/filters'

const subdomainIncludedDids = new Map<string, boolean>()

const didCache = new MemoryCache()
const didResolver = new DidResolver({
    plcUrl: 'https://plc.directory',
    didCache,
  })

export class FirehoseSubscription extends FirehoseSubscriptionBase {
  async handleEvent(evt: RepoEvent) {
    if (!isCommit(evt)) return
    const ops = await getOpsByType(evt)

    // This logs the text of every post off the firehose.
    // Just for fun :)
    // Delete before actually using
    /*
    for (const post of ops.posts.creates) {
      console.log(post.record.text)
    }
    */

    const postsToDelete = ops.posts.deletes.map((del) => del.uri)
    const postsToCreate = ops.posts.creates
      .filter((create) => {
        if (!create.record.langs?.includes('pt')) return false

        // check if user's handle subdomain is in our list of community handle subdomains
        if (!subdomainIncludedDids.has(create.author)) {
          didResolver.resolve(create.author).then((doc) => {
            doc?.alsoKnownAs?.map(h => h.replace("at://", "")).forEach(handle => {
              if (communitySubdomains.some(domain => handle.endsWith(`${domain}`))) {
                subdomainIncludedDids.set(create.author, true)
                console.log(`Including ${create.author} in feed`)
              } else {
                subdomainIncludedDids.set(create.author, false)
              }
            })
          })
        }

        return (
          allTerms.some((x) => create.record.text.toLowerCase().includes(x))
          || dids.includes(create.author)
          || regex.some((x) => x.test(create.record.text))
          || subdomainIncludedDids.get(create.author)
        ) && !excludeTerms.some((x) => create.record.text.toLowerCase().includes(x))
      })
      .map((create) => {
        // map alf-related posts to a db row
        return {
          uri: create.uri,
          cid: create.cid,
          indexedAt: new Date().toISOString(),
        }
      })

    if (postsToDelete.length > 0) {
      await this.db
        .deleteFrom('post')
        .where('uri', 'in', postsToDelete)
        .execute()
    }

    if (postsToCreate.length > 0) {
      for (const post of postsToCreate) {
        console.log(post)
      }

      await this.db
        .insertInto('post')
        .values(postsToCreate)
        .onConflict((oc) => oc.doNothing())
        .execute()
    }
  }
}
