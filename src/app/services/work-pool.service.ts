import { Injectable } from '@angular/core';
import {ApiService} from "./api.service";

@Injectable()
export class WorkPoolService {
  poolLength = 75;

  pool = [];

  constructor(private nodeApi: ApiService) { }


  addToPool(hash: string) {
    const existingJob = this.pool.find(p => p.hash == hash);
    if (existingJob) return existingJob.value;

    const newJob = { hash, value: this.nodeApi.workGenerate(hash) };

    this.pool.push(newJob);

    if (this.pool.length >= this.poolLength) this.pool.shift(); // Prune if we are at max length

    return newJob.value;
  }

  getWork(hash: string) {
    const existingJob = this.pool.find(p => p.hash == hash);
    if (existingJob) return existingJob.value;

    return this.addToPool(hash);
  }
}
