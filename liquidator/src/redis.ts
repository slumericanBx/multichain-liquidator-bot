import { RedisClientType } from '@redis/client'
import { createClient } from 'redis'
import { Position } from './types/position'

export interface IRedisInterface {
	connect(): Promise<RedisClientType>
	popUnhealthyRedbankPositions(count: number): Promise<Position[]>
	incrementBy(key: string, value: number): Promise<number>
}

export class RedisInterface implements IRedisInterface {
	// We use a singleton but expose the client via connect()
	private client: RedisClientType | undefined
	private key: string

	/**
	 *
	 * @param key the key to the liquidation redis list. Note that for production
	 * the key should be set by the environment variable that is given to it by
	 * the manager service, as this key needs to be shared with the collector
	 */
	constructor(key?: string) {
		// Priority:
		// 	if environment var set, use that (this will be the case in prod).
		// 	if no env, try use key passed in.
		// 	if no key passed in, use default testing key.
		this.key = process.env.LIQUIDATION_QUEUE_NAME
			? process.env.LIQUIDATION_QUEUE_NAME
			: key
			? key
			: 'testing-queue'
	}

	async popUnhealthyRoverAccountId(): Promise<string> {
		if (!this.client) {
			throw new Error()
		}

		const record = await this.client.lPopCount(this.key, 1)

		if (!record) return ''

		return record[0]
	}

	/**
	 * Fetch all addresses out of UNHEALTHY_QUEUE redis list
	 *
	 * Note that the max this can return at 1 time is 1000, any more will be left in
	 * the list
	 */
	async popUnhealthyRedbankPositions(count: number): Promise<Position[]> {
		if (!this.client) {
			console.log(`ERROR: redis client not connected`)
			return []
		}

		const result = await this.client.lPopCount(this.key, count)

		if (!result) return []

		return result?.map((positionString: string) => JSON.parse(positionString))
	}

	/**
	 * Increment the value at key by value
	 * @param key The key to increment
	 * @param value The value to increment by
	 */
	async incrementBy(key: string, value: number): Promise<number> {
		if (!this.client) {
			console.log(`ERROR: redis client not connected`)
			return 0
		}

		return await this.client.incrBy(key, value)
	}

	/**
	 * @param url The redis endpoint. Not pass this parameter defaults to localhost
	 */
	async connect(url?: string): Promise<RedisClientType> {
		if (this.client) {
			// client already exists
			return this.client
		}

		this.client = url ? createClient({ url }) : createClient()

		// todo logging
		this.client.on('error', (err) => console.error('Redis Client Error', err))
		await this.client.connect()

		return this.client
	}
}
