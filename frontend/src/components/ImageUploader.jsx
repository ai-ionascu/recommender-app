import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const VITE_API_URL = import.meta.env.VITE_API_URL;

const ImageUploader = ({ productId, formData, productImages, onImagesUpdate }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [tempDummyImage, setTempDummyImage] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [generationError, setGenerationError] = useState(null);
  const [uploadError, setUploadError] = useState(null);

  // Store batch of fetched images for current category
  const [imageBatch, setImageBatch] = useState([]);
  // Store current category for comparison
  const lastCategoryRef = useRef('');

  // Map category & accessory_type to search term strings
  const searchTerms = {
    wine: "wine bottle",
    spirits: {
      whiskey: "whiskey bottle",
      vodka: "vodka bottle",
      gin: "gin bottle",
      rhum: "rhum bottle",
      tequila: "tequila bottle",
      brandy: "brandy bottle"
    },
    beer: "beer bottle",
    accessories: "drink accessories"
  };


  const accessoryTerms = {
  wine: {
    glassware: "wine glasses",
    decanter: "wine decanter",
    opener: "cork screw",
    gift_set: "wine gift set"
  },
  spirits: {
    glassware: "whiskey glasses",
    decanter: "whiskey decanter",
    opener: "bottle stopper",
    gift_set: "whiskey gift set"
  },
  beer: {
    glassware: "beer mugs",
    decanter: "beer growler",
    opener: "beer opener",
    gift_set: "beer gift set"
  }
};

  // Helper to get current search query based on formData
  const getSearchQuery = () => {
    if (!formData.category) return null;

    if (formData.category === 'spirits') {
      const spiritType = formData.spirit_type?.toLowerCase();
      if (spiritType && searchTerms.spirits[spiritType]) {
        return searchTerms.spirits[spiritType];
      }
      return "whiskey bottle"; // fallback pentru spirits dacă nu avem spirit_type valid
    }

    if (formData.category === 'accessories') {
      const drinkType = formData.compatible_with_product_type?.toLowerCase();
      const accessoryType = formData.accessory_type?.toLowerCase();

      if (
        drinkType &&
        accessoryType &&
        drinkType !== 'all' &&
        accessoryTerms[drinkType] &&
        accessoryTerms[drinkType][accessoryType]
      ) {
        return accessoryTerms[drinkType][accessoryType];
      }
      return "drink accessories";
    }

    return searchTerms[formData.category] || "wine bottle";
  };

  // Reset batch on category change
  useEffect(() => {
    const currentQuery = getSearchQuery();

    if (currentQuery !== lastCategoryRef.current) {
      lastCategoryRef.current = currentQuery;
      setImageBatch([]);
      setTempDummyImage(null);
      setGenerationError(null);
    }
  }, [formData.category, formData.spirit_type, formData.accessory_type, formData.compatible_with_product_type]);


  const fetchNewBatch = async (query) => {
    const perPage = 50;
    const maxPages = 50;
    const randomPage = Math.floor(Math.random() * maxPages) + 1;

    const response = await axios.get(
      `${VITE_API_URL}/products/images/search?query=${encodeURIComponent(query)}&per_page=${perPage}&page=${randomPage}`
    );

    if (!response.data || response.data.length === 0) {
      throw new Error('No images found for the given query.');
    }

    return response.data; // Array of images
  };

  const generateDummyImage = async () => {
    try {
      setIsGenerating(true);
      setGenerationError(null);

      const query = getSearchQuery();
      console.log('Current search query:', query);
      if (!query) throw new Error('Please provide category.');

      let images = imageBatch;

      if (images.length === 0) {
        images = await fetchNewBatch(query);
        setImageBatch(images);
      }

      const randomIndex = Math.floor(Math.random() * images.length);
      const selectedImage = images[randomIndex];

      const newBatch = [...images];
      newBatch.splice(randomIndex, 1);
      setImageBatch(newBatch);

      setTempDummyImage(selectedImage);
      console.log('Selected dummy image:', selectedImage);
    } catch (error) {
      setGenerationError(error.message);
      setTempDummyImage({
        url: `https://placehold.co/800x1000?text=${encodeURIComponent(error.message)}`,
        alt_text: "Error generating image."
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddDummyImage = () => {
    if (tempDummyImage) {
      onImagesUpdate([...productImages, tempDummyImage]);
      setTempDummyImage(null);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return;

    try {
      setIsUploading(true);
      setUploadError(null);

      const formDataToSend = new FormData();
      formDataToSend.append('image', selectedFile);

      const response = await axios.post(
        `${VITE_API_URL}/products/${productId}/images`,
        formDataToSend,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      onImagesUpdate([...productImages, {
        url: response.data.url,
        alt_text: selectedFile.name
      }]);
      setSelectedFile(null);

    } catch (error) {
      setUploadError(error.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="image-uploader-container">
      <div className="controls">
        <input 
          type="file"
          onChange={(e) => setSelectedFile(e.target.files[0])}
        />
        
        <button onClick={generateDummyImage} disabled={isGenerating}>
          {isGenerating ? 'Generating...' : 'Generate Dummy'}
        </button>
        
        {tempDummyImage && (
          <button onClick={handleAddDummyImage}>
            Add to Product
          </button>
        )}
        
        {selectedFile && (
          <button onClick={handleFileUpload} disabled={isUploading}>
            {isUploading ? 'Uploading...' : 'Upload File'}
          </button>
        )}
      </div>
      
      {tempDummyImage && (
        <div className="preview" style={{ width: '320px', height: '400px', overflow: 'hidden' }}>
          <img 
            src={tempDummyImage.url} 
            alt={tempDummyImage.alt_text}
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
          />
        </div>
      )}
      
      {generationError && <p className="error">{generationError}</p>}
      {uploadError && <p className="error">{uploadError}</p>}
    </div>
  );
};

export default ImageUploader;
