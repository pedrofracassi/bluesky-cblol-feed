import {
  OutputSchema as RepoEvent,
  isCommit,
} from './lexicon/types/com/atproto/sync/subscribeRepos'
import { FirehoseSubscriptionBase, getOpsByType } from './util/subscription'

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

        const excludeTerms = [
          "follow trick",
          "sdv"
        ]

        const includeTerms = [
          'CBLOL',
          'Pain Gaming',
          'keydstars.gg',
          'furia.gg',
          'paingaming.bsky.social',
          'intzesports.bsky.social',
          'conferência sul',
          'red canids'
        ]

        const regex = [
          /\bintz\b/,
          /\bdynquedo\b/,
          /\bcariok\b/
        ]

        // only alf-related posts
        return (
          includeTerms.some((x) => create.record.text.toLowerCase().includes(x))
          || regex.some((x) => x.test(create.record.text))
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
