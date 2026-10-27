// /editor for the demo example.
import '../styles.css';
import '../core/editor.css';
import rawContent from '../../examples/demo/content.json';
import type { Content } from '../core/content.ts';
import { mountEditor } from '../core/editor.ts';

mountEditor(rawContent as unknown as Content);
