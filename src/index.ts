/**
 * VoxYZ - Audio Communication Layer for Agent Orchestration
 * Entry point
 */
import { VoxYZServer } from './server';

const server = new VoxYZServer();
server.start();
