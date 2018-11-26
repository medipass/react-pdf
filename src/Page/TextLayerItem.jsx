import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import PageContext from '../PageContext';

import { isPage, isRotate } from '../shared/propTypes';

export class TextLayerItemInternal extends PureComponent {
  componentDidMount() {
    this.alignTextItem();
  }

  componentDidUpdate() {
    this.alignTextItem();
  }

  get unrotatedViewport() {
    const { page, scale } = this.props;

    return page.getViewport(scale);
  }

  /**
   * It might happen that the page is rotated by default. In such cases, we shouldn't rotate
   * text content.
   */
  get rotate() {
    const { page, rotate } = this.props;
    return rotate - page.rotate;
  }

  get sideways() {
    const { rotate } = this;
    return rotate % 180 !== 0;
  }

  get defaultSideways() {
    const { rotation } = this.unrotatedViewport;
    return rotation % 180 !== 0;
  }

  get fontSize() {
    const { transform } = this.props;
    const { defaultSideways } = this;
    const [fontHeightPx, fontWidthPx] = transform;
    return defaultSideways ? fontWidthPx : fontHeightPx;
  }

  get top() {
    const { transform } = this.props;
    const { unrotatedViewport: viewport, defaultSideways } = this;
    const [/* fontHeightPx */, /* fontWidthPx */, offsetX, offsetY, x, y] = transform;
    const [/* xMin */, yMin, /* xMax */, yMax] = viewport.viewBox;
    return defaultSideways ? x + offsetX + yMin : yMax - (y + offsetY);
  }

  get left() {
    const { transform } = this.props;
    const { unrotatedViewport: viewport, defaultSideways } = this;
    const [/* fontHeightPx */, /* fontWidthPx */, /* offsetX */, /* offsetY */, x, y] = transform;
    const [xMin] = viewport.viewBox;
    return defaultSideways ? y - xMin : x - xMin;
  }

  async getFontData(fontName) {
    const { page } = this.props;

    const font = await page.commonObjs.ensureObj(fontName);

    return font.data;
  }

  async alignTextItem() {
    const { page } = this.props;
    const element = this.item;

    if (!element) {
      return;
    }

    element.style.transform = '';

    const { fontName, scale, width } = this.props;

    const fontData = await this.getFontData(fontName);

    const fallbackFontName = fontData ? fontData.fallbackName : 'sans-serif';
    element.style.fontFamily = `${fontName}, ${fallbackFontName}`;

    const targetWidth = width * scale;
    const actualWidth = this.getElementWidth(element);

    const ascent = fontData ? fontData.ascent : 1;

    element.style.left = `${(this.left / page.getViewport(1).width) * 100}%`;
    element.style.top = `${(this.top / page.getViewport(1).height) * 100}%`;
    element.style.transform = `scaleX(${(targetWidth * 1.02 / actualWidth) / 3}) translateY(${(1 - ascent) * 100}%)`;
  }

  getElementWidth = (element) => {
    const { sideways } = this;
    return element.getBoundingClientRect()[sideways ? 'height' : 'width'];
  };

  render() {
    const { fontSize } = this;
    const {
      customTextRenderer, fontName, scale, str: text,
    } = this.props;

    return (
      <div
        style={{
          height: '1em',
          fontFamily: fontName,
          fontSize: `${(fontSize * scale) / 3}px`,
          position: 'absolute',
          transformOrigin: 'left bottom',
          whiteSpace: 'pre',
          pointerEvents: 'all',
        }}
        ref={(ref) => { this.item = ref; }}
      >
        {
          customTextRenderer
            ? customTextRenderer(this.props)
            : text
        }
      </div>
    );
  }
}

TextLayerItemInternal.propTypes = {
  customTextRenderer: PropTypes.func,
  fontName: PropTypes.string.isRequired,
  itemIndex: PropTypes.number.isRequired, // eslint-disable-line react/no-unused-prop-types
  page: isPage.isRequired,
  rotate: isRotate,
  scale: PropTypes.number,
  str: PropTypes.string.isRequired,
  transform: PropTypes.arrayOf(PropTypes.number).isRequired,
  width: PropTypes.number.isRequired,
};

const TextLayerItem = props => (
  <PageContext.Consumer>
    {context => <TextLayerItemInternal {...context} {...props} />}
  </PageContext.Consumer>
);

export default TextLayerItem;
